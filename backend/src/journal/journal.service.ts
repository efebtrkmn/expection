import {
  Injectable,
  UnprocessableEntityException,
  NotFoundException,
  InternalServerErrorException,
  Logger
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction, JournalStatus } from '@prisma/client';
import { Decimal } from 'decimal.js';

@Injectable()
export class JournalService {
  private readonly logger = new Logger(JournalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * Çift taraflı yevmiye kaydını (ACID Transaction ile) atar.
   * Borç ve Alacak dengesizse (eşit değilse) DB 'Rollback' yapar ve işlem iptal olur.
   */
  async postJournalEntry(dto: CreateJournalDto, tenantId: string, userId: string) {
    // 1. Matematiksel Denge Kontrolü (Decimal.js ile kayan nokta hatası önlenir)
    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);

    for (const line of dto.lines) {
      if (line.debit > 0 && line.credit > 0) {
        throw new UnprocessableEntityException('Bir satırda hem borç hem alacak olamaz.');
      }
      totalDebit = totalDebit.plus(line.debit);
      totalCredit = totalCredit.plus(line.credit);
    }

    if (!totalDebit.equals(totalCredit)) {
      throw new UnprocessableEntityException(
        `Yevmiye dengesi hatalı! Borç Toplamı: ${totalDebit.toFixed(2)}, Alacak Toplamı: ${totalCredit.toFixed(2)}`
      );
    }

    // 2. ACID Transaction Başlangıcı
    try {
      return await this.prisma.withTenantTransaction(tenantId, async (tx) => {
        // İşlem Numarası (Entry Number) Kontrolü
        const existing = await tx.journalEntry.findFirst({
          where: { tenantId, entryNumber: dto.entryNumber }
        });

        if (existing) {
          throw new UnprocessableEntityException(`Fiş numarası (${dto.entryNumber}) zaten kullanımda`);
        }

        const isPosted = dto.status === JournalStatus.POSTED;

        // Fişi (Başlık) oluştur
        const entry = await tx.journalEntry.create({
          data: {
            tenantId,
            entryNumber: dto.entryNumber,
            entryDate: new Date(dto.entryDate),
            description: dto.description,
            referenceType: dto.referenceType,
            referenceId: dto.referenceId,
            status: dto.status || JournalStatus.DRAFT,
            totalAmount: totalDebit.toNumber(),
            postedAt: isPosted ? new Date() : null,
            createdById: userId,
            lines: {
              create: dto.lines.map((l) => ({
                tenantId,
                accountId: l.accountId,
                description: l.description,
                debit: l.debit,
                credit: l.credit,
                currency: l.currency || 'TRY',
                exchangeRate: l.exchangeRate || 1.0,
              })),
            },
          },
          include: { lines: true }
        });

        // Denetim Günlüğü
        await this.auditLog.logEntityChange({
          tenantId,
          userId,
          action: AuditAction.CREATE,
          entityType: 'journal_entry',
          entityId: entry.id,
          newValues: { ...entry, lines: dto.lines },
        });

        this.logger.log(`Yevmiye Başarıyla Oluşturuldu: ${entry.entryNumber} [DB: ${totalDebit}]`);
        return entry;
      });
    } catch (error) {
      if (error instanceof UnprocessableEntityException) {
        throw error;
      }
      this.logger.error(`Yevmiye kaydı hatası: ${error.message}`);
      throw new InternalServerErrorException('Yevmiye kaydedilirken kritik bir altyapı hatası oluştu');
    }
  }

  async findAll(tenantId: string) {
    return this.prisma.journalEntry.findMany({
      where: { tenantId },
      orderBy: { entryDate: 'desc' },
      include: { lines: { include: { account: true } } }
    });
  }

  async findOne(id: string, tenantId: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, tenantId },
      include: { lines: { include: { account: true } } }
    });
    if (!entry) throw new NotFoundException('Yevmiye kaydı bulunamadı');
    return entry;
  }

  async setStatus(id: string, status: JournalStatus, tenantId: string, userId: string) {
    const entry = await this.findOne(id, tenantId);
    
    // Zaten Cancelled ise müdahale edilemez
    if (entry.status === JournalStatus.CANCELLED) {
      throw new UnprocessableEntityException('İptal edilmiş kayıt değiştirilemez');
    }

    const updated = await this.prisma.journalEntry.update({
      where: { id },
      data: {
        status,
        postedAt: status === JournalStatus.POSTED && !entry.postedAt ? new Date() : entry.postedAt
      }
    });

    await this.auditLog.logEntityChange({
      tenantId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'journal_entry',
      entityId: entry.id,
      oldValues: { status: entry.status },
      newValues: { status: updated.status }
    });

    return updated;
  }
}
