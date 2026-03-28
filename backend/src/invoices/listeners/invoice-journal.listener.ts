import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JournalService } from '../../journal/journal.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceType, JournalReferenceType, JournalStatus } from '@prisma/client';
import { CreateJournalDto, LedgerLineDto } from '../../journal/dto/create-journal.dto';

@Injectable()
export class InvoiceJournalListener {
  private readonly logger = new Logger(InvoiceJournalListener.name);

  // Tenant ve Kod Bazlı UUID Önbelleği (Gereksiz DB sorgularından kurtulmak için)
  private accountCache = new Map<string, string>();

  constructor(
    private readonly journalService: JournalService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * "invoice.posted" (Fatura Kesildi) Olayını Yakalar
   */
  @OnEvent('invoice.posted', { async: true })
  async handleInvoicePostedEvent(payload: { tenantId: string; userId: string; invoice: any }) {
    const { invoice, tenantId, userId } = payload;
    this.logger.log(`[EVENT] Otomatik Yevmiye Kaydı tetiklendi - Fatura No: ${invoice.invoiceNumber}`);

    try {
      const lines: LedgerLineDto[] = [];
      const totalAmount = Number(invoice.totalAmount);
      const subtotal = Number(invoice.subtotal);
      const taxAmount = Number(invoice.taxAmount);
      const withholding = Number(invoice.withholdingTotal);

      // 1. SATIŞ FATURASI MUHASEBESİ
      if (invoice.type === InvoiceType.SALES) {
        // Borç (DR): Alıcılar (120) = Fatura Genel Toplamı
        lines.push({
          accountId: await this.getAccountId(tenantId, '120'),
          debit: totalAmount,
          credit: 0,
          description: `Satış Faturası No: ${invoice.invoiceNumber}`,
        });

        // Borç (DR): Diğer Çeşitli Alacaklar (136) = KDV Tevkifatı
        if (withholding > 0) {
          lines.push({
            accountId: await this.getAccountId(tenantId, '136', true), // isSystem zorunlu değilse oluşturur
            debit: withholding,
            credit: 0,
            description: 'KDV Tevkifatı Alacağı',
          });
        }

        // Alacak (CR): Yurtiçi Satışlar (600) = KDV Hariç Ana Tutar (Matrah)
        lines.push({
          accountId: await this.getAccountId(tenantId, '600'),
          debit: 0,
          credit: subtotal,
          description: 'Yurtiçi Satış Geliri',
        });

        // Alacak (CR): Hesaplanan KDV (391) = (KDV Toplamı - Kesilen Tevkifat)
        const netTax = taxAmount - withholding;
        if (netTax > 0) {
          lines.push({
            accountId: await this.getAccountId(tenantId, '391'),
            debit: 0,
            credit: netTax,
            description: 'Hesaplanan KDV',
          });
        }
      } 
      // 2. ALIŞ FATURASI (GİDER/MAL ALIMI) MUHASEBESİ
      else if (invoice.type === InvoiceType.PURCHASE) {
        // Borç (DR): Ticari Mallar / Gider (153 veya 770)
        lines.push({
          accountId: await this.getAccountId(tenantId, '153'),
          debit: subtotal,
          credit: 0,
          description: `Alım Faturası: ${invoice.invoiceNumber}`,
        });

        // Borç (DR): İndirilecek KDV (191)
        if (taxAmount > 0) {
          lines.push({
            accountId: await this.getAccountId(tenantId, '191'),
            debit: taxAmount,
            credit: 0,
            description: 'İndirilecek KDV',
          });
        }

        // Alacak (CR): Satıcılar / Cari Hesap (320)
        lines.push({
          accountId: await this.getAccountId(tenantId, '320'),
          debit: 0,
          credit: totalAmount,
          description: 'Cari Borç Tahakkuku',
        });
      }

      // ACID Transaction ve Denge Kontrolünü tetikleyerek DB'ye yaz (Hata fırlatırsa JournalService Rollback eder)
      const entryNumber = `OTOM-${Date.now().toString().slice(-5)}`;
      await this.journalService.postJournalEntry(
        {
          entryNumber, // TS Trick için ekstra alan
          entryDate: new Date(invoice.issueDate),
          description: `Tam Otomatik Entegrasyon: ${invoice.invoiceNumber} Nolu Fatura Mahsubu`,
          referenceType: JournalReferenceType.INVOICE,
          referenceId: invoice.id,
          status: JournalStatus.POSTED,
          lines,
        } as any,
        tenantId,
        userId,
      );

      // Fatura (Invoice) kaydı üzerinde Yevmiye Fişi ID'sini güncelle
      const journalEntry = await this.prisma.journalEntry.findFirst({ where: { tenantId, entryNumber } });
      if (journalEntry) {
        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: { journalEntryId: journalEntry.id },
        });
      }

      this.logger.log(`BAŞARILI: ${invoice.invoiceNumber} Nolu faturanın Yevmiyesi tescil edildi.`);
    } catch (error) {
      // Hata durumunda işlemi (Faturayı) geri alamayız fakat güçlü bir log bırakmalıyız.
      this.logger.error(`KRİTİK HATA: Otomatik Yevmiye Başarısız: ${error.message} - FATURA: ${invoice.invoiceNumber}`);
    }
  }

  /**
   * Tekdüzen Hesap Planı Kodu Üzerinden Gerçek UUID ID'sini Getirir (Cache ile hızlandırılmıştır)
   */
  private async getAccountId(tenantId: string, code: string, autoCreate = false): Promise<string> {
    const cacheKey = `${tenantId}_${code}`;
    if (this.accountCache.has(cacheKey)) return this.accountCache.get(cacheKey)!;

    let account = await this.prisma.account.findUnique({
      where: { tenantId_code: { tenantId, code } },
      select: { id: true },
    });

    if (!account && autoCreate) {
      // Örn: Sistemde 136 Diğer Alacaklar yüklü değilse ve tevkifat kesilmişse anlık olarak hesap açar
      account = await this.prisma.account.create({
        data: {
          tenantId,
          code,
          name: 'Otomatik Oluşturulan Hesap',
          type: 'ASSET',
          normalBalance: 'DEBIT',
          isSystem: false,
        },
      });
    } else if (!account) {
      throw new Error(`${code} nolu hesap planı sistemde bulunamadı. Lütfen hesap planını güncelleyiniz.`);
    }

    this.accountCache.set(cacheKey, account.id);
    return account.id;
  }
}
