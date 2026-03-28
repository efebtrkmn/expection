import {
  Injectable, NotFoundException, GoneException,
  BadRequestException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { ReconciliationStatus, InvoiceStatus } from '@prisma/client';
import { Cron } from '@nestjs/schedule';
import { Decimal } from 'decimal.js';
import * as crypto from 'crypto';
import { SendReconciliationDto, RespondReconciliationDto } from './dto/reconciliation.dto';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Admin: Müşteriye mutabakat e-postası gönder
   * Tenant ayarlarından mutabakat süresini okur (default 7 gün)
   */
  async sendReconciliation(dto: SendReconciliationDto, tenantId: string, userId: string) {
    const customer = await this.prisma.customerSupplier.findFirst({
      where: { id: dto.customerSupplierId, tenantId },
      select: { id: true, name: true, email: true },
    });
    if (!customer) throw new NotFoundException('Cari hesap bulunamadı');
    if (!customer.email) throw new BadRequestException('Carinin e-posta adresi kayıtlı değil');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
    const periodDays = settings?.reconciliationPeriodDays ?? 7;

    // Mevcut bakiye snapshot'ı
    const snapshot = await this.buildStatementSnapshot(dto.customerSupplierId, tenantId);

    // Güvenli token üretimi: raw → e-postada, hash → DB'de
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);

    await this.prisma.reconciliationRequest.create({
      data: {
        tenantId,
        customerSupplierId: dto.customerSupplierId,
        tokenHash,
        expiresAt,
        statementSnapshot: snapshot as any,
        createdById: userId,
      },
    });

    const portalUrl = this.config.get<string>('CLIENT_PORTAL_URL', 'https://portal.expection.com');
    const link = `${portalUrl}/reconcile?token=${rawToken}`;

    await this.mailService.sendReconciliationLink(customer.email, {
      customerName: customer.name,
      tenantName: tenant?.name || 'İşletmeniz',
      link,
      expiresAt,
      totalDebt: snapshot.totalDebt,
    });

    this.logger.log(`Mutabakat gönderildi: ${customer.name} (${periodDays} gün süre)`);

    return {
      message: `Mutabakat bildirimi ${customer.email} adresine gönderildi`,
      expiresAt,
      periodDays,
    };
  }

  /**
   * Müşteri: Token ile ekstre görüntüle (Şifre gerekmez)
   */
  async verifyToken(rawToken: string) {
    const req = await this.findValidRequest(rawToken);
    return {
      statement: req.statementSnapshot,
      customerSupplierId: req.customerSupplierId,
      expiresAt: req.expiresAt,
      expiresInHours: Math.round((req.expiresAt.getTime() - Date.now()) / 3600000),
    };
  }

  /**
   * Müşteri: Onayla veya Reddet
   */
  async respond(rawToken: string, dto: RespondReconciliationDto, ipAddress: string) {
    const req = await this.findValidRequest(rawToken);

    if (req.status !== ReconciliationStatus.PENDING) {
      throw new BadRequestException('Bu mutabakat talebi zaten yanıtlanmış.');
    }

    const newStatus = dto.decision === 'APPROVED'
      ? ReconciliationStatus.APPROVED
      : ReconciliationStatus.REJECTED;

    await this.prisma.reconciliationRequest.update({
      where: { id: req.id },
      data: {
        status: newStatus,
        respondedAt: new Date(),
        responseIp: ipAddress,
        responseNote: dto.note,
      },
    });

    // Admin'e bildirim e-postasi
    const adminUser = await this.prisma.user.findFirst({
      where: { tenantId: req.tenantId, role: 'SuperAdmin', isActive: true },
      select: { email: true },
    });
    if (adminUser?.email) {
      const cs = await this.prisma.customerSupplier.findUnique({
        where: { id: req.customerSupplierId },
        select: { name: true },
      });
      const tenant = await this.prisma.tenant.findUnique({ where: { id: req.tenantId } });
      await this.mailService.send(
        adminUser.email,
        `Mutabakat ${dto.decision === 'APPROVED' ? 'Onaylandi' : 'Reddedildi'}`,
        'admin-reconciliation-response',
        { customerName: cs?.name, decision: dto.decision, note: dto.note, ip: ipAddress, tenantName: tenant?.name },
      );
    }

    this.logger.log(`Mutabakat yanıtlandı: ${newStatus} — IP: ${ipAddress}`);

    return {
      message: dto.decision === 'APPROVED' ? 'Mutabakat onaylandı.' : 'Mutabakat reddedildi.',
      status: newStatus,
      respondedAt: new Date(),
    };
  }

  /**
   * Zımni Kabul Worker — Her gün 09:00 (İstanbul saati)
   * Süresi dolmuş + PENDING kalan talepleri TACIT_APPROVED yapar
   */
  @Cron('0 9 * * *', { name: 'tacit_approval_worker', timeZone: 'Europe/Istanbul' })
  async processTacitApprovals() {
    this.logger.log('[CRON] Zımni kabul kontrolü başlatılıyor...');

    const expired = await this.prisma.reconciliationRequest.findMany({
      where: {
        status: ReconciliationStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
    });

    this.logger.log(`${expired.length} zımni kabul tespit edildi`);

    for (const req of expired) {
      await this.prisma.reconciliationRequest.update({
        where: { id: req.id },
        data: {
          status: ReconciliationStatus.TACIT_APPROVED,
          respondedAt: new Date(),
          responseNote: 'Sure dolmasi nedeniyle zimni kabul',
        },
      });

      // Admin'e bildirim
      const adminUser = await this.prisma.user.findFirst({
        where: { tenantId: req.tenantId, role: 'SuperAdmin', isActive: true },
        select: { email: true },
      });
      const tenant = await this.prisma.tenant.findUnique({ where: { id: req.tenantId }, select: { name: true } });
      const cs = await this.prisma.customerSupplier.findUnique({ where: { id: req.customerSupplierId }, select: { name: true } });
      if (adminUser?.email) {
        await this.mailService.sendTacitApprovalNotice(adminUser.email, {
          customerName: cs?.name || 'Bilinmeyen',
          tenantName: tenant?.name || 'Isletme',
          period: `${(req.expiresAt.getTime() - req.sentAt.getTime()) / 86400000} gun`,
        });
      }
    }

    this.logger.log(`Zımni kabul tamamlandı: ${expired.length} kayıt güncellendi`);
  }

  /** Mutabakat listesi (Admin) */
  async list(tenantId: string) {
    return this.prisma.reconciliationRequest.findMany({
      where: { tenantId },
      include: { customerSupplier: { select: { name: true, email: true } } },
      orderBy: { sentAt: 'desc' },
    });
  }

  // ─── Yardımcı Metodlar ──────────────────────────────────────────────────────

  private async findValidRequest(rawToken: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const req = await this.prisma.reconciliationRequest.findUnique({ where: { tokenHash } });

    if (!req) throw new NotFoundException('Geçersiz mutabakat bağlantısı');
    if (new Date() > req.expiresAt) {
      throw new GoneException('Bu mutabakat bağlantısının süresi dolmuş.');
    }

    return req;
  }

  private async buildStatementSnapshot(contactId: string, tenantId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        customerSupplierId: contactId,
        status: { notIn: [InvoiceStatus.DRAFT, InvoiceStatus.PAID] },
      },
      select: { invoiceNumber: true, issueDate: true, dueDate: true, totalAmount: true, status: true },
    });

    const totalDebt = invoices.reduce((s, i) => s.plus(i.totalAmount), new Decimal(0));

    return {
      generatedAt: new Date().toISOString(),
      invoiceCount: invoices.length,
      totalDebt: totalDebt.toNumber(),
      invoices: invoices.map(i => ({
        ...i,
        totalAmount: Number(i.totalAmount),
      })),
    };
  }
}
