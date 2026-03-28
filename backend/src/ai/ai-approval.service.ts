import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JournalService } from '../journal/journal.service';
import { AiClassificationStatus, JournalReferenceType } from '@prisma/client';
import { ReviewClassificationDto } from './dto/classify-expense.dto';

@Injectable()
export class AiApprovalService {
  private readonly logger = new Logger(AiApprovalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly journalService: JournalService,
  ) {}

  /** PENDING_REVIEW kuyruğunu listele */
  async getPendingQueue(tenantId: string) {
    return this.prisma.aiClassificationQueue.findMany({
      where: { tenantId, status: AiClassificationStatus.PENDING_REVIEW },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Tüm kuyruk (filtreli) */
  async getQueue(tenantId: string, status?: AiClassificationStatus) {
    return this.prisma.aiClassificationQueue.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * İnsan onayı — Yevmiye oluşturulur (düzeltilmiş veya onaylanmış hesap koduyla)
   */
  async approve(queueId: string, tenantId: string, userId: string, dto: ReviewClassificationDto) {
    const entry = await this.findEntry(queueId, tenantId);
    this.assertPending(entry);

    // Düzeltilmiş veya onaylanmış hesap kodunu bul
    const targetAccount = await this.prisma.account.findFirst({
      where: { tenantId, code: { startsWith: dto.accountCode.substring(0, 3) }, isActive: true },
    });

    if (!targetAccount) {
      throw new BadRequestException(`"${dto.accountCode}" kodu ile eşleşen aktif hesap bulunamadı`);
    }

    const cashAccount = await this.prisma.account.findFirst({
      where: { tenantId, code: { startsWith: '100' }, isActive: true },
    });
    if (!cashAccount) throw new BadRequestException('Kasa hesabı (100) bulunamadı');

    const journalEntry = await this.journalService.postJournalEntry({
      entryNumber: `AI-M-${Date.now()}`,
      entryDate: new Date().toISOString(),
      description: `AI İnsan Onayı: ${entry.inputText.substring(0, 100)}`,
      referenceType: JournalReferenceType.MANUAL,
      referenceId: entry.referenceId || undefined,
      lines: [
        { accountId: targetAccount.id, debit: 0, credit: 100, description: entry.inputText.substring(0, 200) },
        { accountId: cashAccount.id, debit: 100, credit: 0, description: 'İnsan onaylı AI sınıflandırma' },
      ],
    }, tenantId, userId);

    await this.prisma.aiClassificationQueue.update({
      where: { id: queueId },
      data: {
        status: AiClassificationStatus.HUMAN_APPROVED,
        suggestedAccountCode: dto.accountCode,
        suggestedAccountId: targetAccount.id,
        journalEntryId: journalEntry.id,
        reviewedByUserId: userId,
        reviewNote: dto.note,
        reviewedAt: new Date(),
      },
    });

    const wasCorrect = entry.suggestedAccountCode?.startsWith(dto.accountCode.substring(0, 3));
    this.logger.log(`AI kuyruk onaylandı: ${entry.suggestedAccountCode} → ${dto.accountCode} (Düzeltildi: ${!wasCorrect})`);

    return {
      approved: true,
      accountCode: dto.accountCode,
      accountName: targetAccount.name,
      journalEntryId: journalEntry.id,
      aiWasCorrect: wasCorrect,
    };
  }

  /** Reddet — İsteğe bağlı düzeltme notu ile */
  async reject(queueId: string, tenantId: string, userId: string, dto: ReviewClassificationDto) {
    const entry = await this.findEntry(queueId, tenantId);
    this.assertPending(entry);

    await this.prisma.aiClassificationQueue.update({
      where: { id: queueId },
      data: {
        status: AiClassificationStatus.REJECTED,
        reviewedByUserId: userId,
        reviewNote: dto.note,
        reviewedAt: new Date(),
      },
    });

    this.logger.log(`AI kuyruk reddedildi: ${queueId}`);
    return { rejected: true, note: dto.note };
  }

  // Helpers
  private async findEntry(queueId: string, tenantId: string) {
    const entry = await this.prisma.aiClassificationQueue.findFirst({
      where: { id: queueId, tenantId },
    });
    if (!entry) throw new NotFoundException('AI kuyruk kaydı bulunamadı');
    return entry;
  }

  private assertPending(entry: any) {
    if (entry.status !== AiClassificationStatus.PENDING_REVIEW) {
      throw new BadRequestException(`Bu kayıt zaten işlenmiş: ${entry.status}`);
    }
  }
}
