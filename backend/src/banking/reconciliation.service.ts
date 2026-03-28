import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import { InvoiceStatus } from '@prisma/client';

/**
 * Banka Hareketi ↔ Fatura Otomatik Eşleştirme (Reconciliation) Servisi
 *
 * Eşleştirme Mantığı:
 * 1. Eşleşmemiş (is_reconciled=false) banka hareketlerini tara
 * 2. Hareketin açıklama/referans alanında fatura numarası ara (fuzzy match)
 * 3. Tutar ve para birimi uyuyorsa fatura ile eşleştir
 * 4. Eşleşirse: fatura.status = PAID, bank_tx.is_reconciled = true
 */
@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Her gece 02:00'de otomatik eşleştirme çalışır */
  @Cron('0 2 * * *', { name: 'reconciliation_job', timeZone: 'Europe/Istanbul' })
  async scheduledReconciliation() {
    this.logger.log('[CRON] Mutabakat işlemi başlatılıyor...');

    const unmatched = await this.prisma.bankTransaction.findMany({
      where: { isReconciled: false, type: 'CREDIT' },
    });

    this.logger.log(`${unmatched.length} eşleşmemiş alacak hareketi bulundu`);
    let matchedCount = 0;

    for (const tx of unmatched) {
      try {
        const matched = await this.tryMatch(tx);
        if (matched) matchedCount++;
      } catch (err) {
        this.logger.warn(`Eşleştirme hatası txId=${tx.id}: ${err.message}`);
      }
    }

    this.logger.log(`Mutabakat tamamlandı: ${matchedCount}/${unmatched.length} eşleştirildi`);
  }

  /**
   * Tek bir banka hareketini manuel olarak belirtilen fatura ile eşleştirir
   */
  async manualMatch(txId: string, invoiceId: string, tenantId: string) {
    const [tx, invoice] = await Promise.all([
      this.prisma.bankTransaction.findFirst({ where: { id: txId, tenantId } }),
      this.prisma.invoice.findFirst({ where: { id: invoiceId, tenantId } }),
    ]);

    if (!tx || !invoice) throw new Error('Hareket veya fatura bulunamadı');

    await Promise.all([
      this.prisma.bankTransaction.update({
        where: { id: txId },
        data: { isReconciled: true, matchedInvoiceId: invoiceId },
      }),
      this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.PAID },
      }),
    ]);

    return { matched: true, invoiceId, txId };
  }

  /** Eşleşmemiş hareketleri listele (Manuel aksiyon için) */
  async getUnmatchedTransactions(tenantId: string) {
    return this.prisma.bankTransaction.findMany({
      where: { tenantId, isReconciled: false },
      orderBy: { transactionDate: 'desc' },
    });
  }

  private async tryMatch(tx: any): Promise<boolean> {
    if (!tx.description && !tx.referenceNumber) return false;

    const searchText = `${tx.description || ''} ${tx.referenceNumber || ''}`.toUpperCase();

    // Açıklama içinde fatura numarası gibi görünen pattern'ları ara
    const invoiceNumberMatch = searchText.match(/INV[-‑]?\d+|FAT[-‑]?\d+|[A-Z]{2,5}\d{4}\d+/);
    if (!invoiceNumberMatch) return false;

    const potentialInvoiceNumber = invoiceNumberMatch[0];

    const invoice = await this.prisma.invoice.findFirst({
      where: {
        tenantId: tx.tenantId,
        invoiceNumber: { contains: potentialInvoiceNumber, mode: 'insensitive' },
        status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.SENT, InvoiceStatus.OVERDUE] },
      },
    });

    if (!invoice) return false;

    // Tutar kontrolü (±10 TL tolerans — kur farkı, banka masrafı vb. için)
    const amountDiff = Math.abs(Number(tx.amount) - Number(invoice.totalAmount));
    if (amountDiff > 10) return false;

    await this.manualMatch(tx.id, invoice.id, tx.tenantId);
    this.logger.log(`Eşleştirildi: BankTx ${tx.referenceNumber} ↔ Fatura ${invoice.invoiceNumber}`);
    return true;
  }
}
