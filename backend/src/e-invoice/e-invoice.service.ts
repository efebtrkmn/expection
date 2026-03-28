import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UblBuilderService } from './ubl-builder.service';
import { IntegratorClientService } from './integrator-client.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction, EInvoiceStatus, InvoiceStatus } from '@prisma/client';
import { EInvoiceWebhookDto } from './dto/webhook-payload.dto';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EInvoiceService {
  private readonly logger = new Logger(EInvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ublBuilder: UblBuilderService,
    private readonly integratorClient: IntegratorClientService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditLog: AuditLogService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Tek bir faturayı GİB'e göndermek için tam akışı orchestrate eder.
   * 1. Fatura + kalemler DB'den alınır
   * 2. UBL-TR XML üretilir, DB'ye kaydedilir
   * 3. XML → Base64 → Entegratör API'ye gönderilir
   * 4. Fatura durumu PENDING yapılır
   */
  async sendInvoice(invoiceId: string, tenantId: string, userId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: {
        items: { include: { product: true } },
        customerSupplier: true,
      },
    });

    if (!invoice) throw new NotFoundException('Fatura bulunamadı');

    if (invoice.status === InvoiceStatus.DRAFT) {
      throw new BadRequestException('Taslak faturalar e-fatura olarak gönderilemez. Önce resmileştirin.');
    }

    if (invoice.eInvoiceStatus === EInvoiceStatus.ACCEPTED) {
      throw new BadRequestException('Bu fatura zaten GİB tarafından kabul edilmiş.');
    }

    // Tenant bilgilerini al (Satıcı tarafı XML için gerekli)
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant bulunamadı');

    // UUID ata
    const docUuid = invoice.eInvoiceUuid || uuidv4();

    // UBL-TR XML üret
    const xmlContent = this.ublBuilder.buildXml(
      { ...invoice, eInvoiceUuid: docUuid },
      tenant,
    );

    // XML'i DB'ye kaydet
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        eInvoiceUuid: docUuid,
        eInvoiceXml: xmlContent,
        eInvoiceStatus: EInvoiceStatus.PENDING,
        eInvoiceSentAt: new Date(),
      },
    });

    // Entegratöre gönder
    const result = await this.integratorClient.sendInvoice(
      xmlContent,
      docUuid,
      invoice.invoiceNumber,
    );

    // Sonucu DB'ye yaz
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        eInvoiceStatus: result.success ? EInvoiceStatus.PENDING : EInvoiceStatus.REJECTED,
        eInvoiceError: result.success ? null : result.message,
      },
    });

    await this.auditLog.logEntityChange({
      tenantId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'e_invoice_send',
      entityId: invoiceId,
      newValues: { uuid: docUuid, status: 'PENDING', integrator: result },
    });

    this.logger.log(`e-Fatura gönderildi: ${invoice.invoiceNumber} → ${result.status}`);

    return { invoiceId, uuid: docUuid, status: result.status, referenceId: result.referenceId };
  }

  /**
   * Faturanın GİB durumunu entegratör API'den anlık sorgular
   */
  async queryStatus(invoiceId: string, tenantId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      select: { eInvoiceUuid: true, eInvoiceStatus: true, invoiceNumber: true },
    });

    if (!invoice) throw new NotFoundException('Fatura bulunamadı');
    if (!invoice.eInvoiceUuid) throw new BadRequestException('Bu fatura henüz entegratöre gönderilmemiş');

    const statusResult = await this.integratorClient.queryStatus(invoice.eInvoiceUuid);

    // Durumu güncelle
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { eInvoiceStatus: statusResult.status as EInvoiceStatus },
    });

    return statusResult;
  }

  /**
   * Üretilen UBL-TR XML içeriğini döndürür (Önizleme / Debug)
   */
  async getXml(invoiceId: string, tenantId: string): Promise<string> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      select: { eInvoiceXml: true, invoiceNumber: true },
    });
    if (!invoice) throw new NotFoundException('Fatura bulunamadı');
    if (!invoice.eInvoiceXml) throw new BadRequestException('Bu fatura için henüz XML üretilmemiş');
    return invoice.eInvoiceXml;
  }

  /**
   * Entegratörden gelen Webhook İşleyicisi
   * HMAC-SHA256 imzası doğrulanmadan hiçbir işlem yapılmaz (Güvenlik)
   */
  async handleWebhook(dto: EInvoiceWebhookDto, rawBody: string, signature: string) {
    // 1. HMAC İmza Doğrulama
    this.verifyWebhookSignature(rawBody, signature);

    // 2. Faturayı UUID üzerinden bul
    const invoice = await this.prisma.invoice.findFirst({
      where: { eInvoiceUuid: dto.invoiceUUID },
      select: { id: true, tenantId: true, invoiceNumber: true, eInvoiceStatus: true },
    });

    if (!invoice) {
      this.logger.warn(`Webhook: Bilinmeyen fatura UUID: ${dto.invoiceUUID}`);
      return { received: true };
    }

    // 3. Durumu güncelle
    const newStatus = this.mapGibStatus(dto.status);
    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        eInvoiceStatus: newStatus,
        eInvoiceError: dto.status === 'REJECTED' ? (dto.gibMessage || 'GİB tarafından reddedildi') : null,
      },
    });

    // 4. WebSocket üzerinden anlık bildirim gönder
    this.eventEmitter.emit('einvoice.status_changed', {
      tenantId: invoice.tenantId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      newStatus,
      gibCode: dto.gibCode,
      gibMessage: dto.gibMessage,
    });

    this.logger.log(`Webhook işlendi: ${invoice.invoiceNumber} → ${newStatus}`);
    return { received: true, invoiceId: invoice.id, newStatus };
  }

  private verifyWebhookSignature(rawBody: string, signature: string) {
    const secret = this.config.get<string>('WEBHOOK_SECRET', '');
    if (!secret) {
      this.logger.warn('WEBHOOK_SECRET env değişkeni set edilmemiş! Güvenlik bypass ediliyor (geliştirme modu)');
      return;
    }
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (expected !== signature) {
      this.logger.error('Webhook imzası doğrulanamadı!');
      throw new UnauthorizedException('Geçersiz webhook imzası');
    }
  }

  private mapGibStatus(status: string): EInvoiceStatus {
    const map: Record<string, EInvoiceStatus> = {
      PENDING: EInvoiceStatus.PENDING,
      IN_PROGRESS: EInvoiceStatus.IN_PROGRESS,
      ACCEPTED: EInvoiceStatus.ACCEPTED,
      REJECTED: EInvoiceStatus.REJECTED,
      CANCELLED: EInvoiceStatus.CANCELLED,
    };
    return map[status] || EInvoiceStatus.PENDING;
  }
}
