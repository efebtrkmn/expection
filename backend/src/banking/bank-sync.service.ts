import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Mt940ParserService } from './mt940-parser.service';
import { firstValueFrom } from 'rxjs';
import { BankTransactionType } from '@prisma/client';

/**
 * Banka Senkronizasyon Cron Job Servisi
 *
 * KolayBi Connect API:
 *   - Base URL: https://api.kolaybi.com/v1
 *   - Auth: Bearer Token (OAuth 2.0 Client Credentials)
 *   - Endpoint: GET /bank-accounts/{accountId}/transactions
 *
 * Her 4 saatte bir tüm aktif banka hesaplarını çeker.
 * Yeni hareketleri bank_transactions tablosuna yazar.
 * Referans numarası üzerinden fatura eşleştirmesi yapar.
 */
@Injectable()
export class BankSyncService {
  private readonly logger = new Logger(BankSyncService.name);
  private readonly kolayBiBaseUrl: string;
  private readonly kolayBiToken: string;
  private readonly isMock: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
    private readonly mt940Parser: Mt940ParserService,
  ) {
    this.kolayBiBaseUrl = config.get<string>('KOLAYBI_BASE_URL', 'https://api.kolaybi.com/v1');
    this.kolayBiToken = config.get<string>('KOLAYBI_API_TOKEN', '');
    this.isMock = !this.kolayBiToken;
  }

  /**
   * Otomatik Cron: Her 4 saatte bir tüm aktif banka hesaplarını senkronize eder.
   */
  @Cron('0 */4 * * *', { name: 'bank_sync_job', timeZone: 'Europe/Istanbul' })
  async scheduledSync() {
    this.logger.log('[CRON] Banka senkronizasyonu başlatılıyor...');

    const accounts = await this.prisma.bankAccount.findMany({
      where: { isActive: true, provider: 'KOLAYBI' },
    });

    this.logger.log(`${accounts.length} aktif KolayBi banka hesabı bulundu`);

    for (const account of accounts) {
      try {
        await this.syncAccount(account.id, account.tenantId, account.providerAccountId);
      } catch (err) {
        this.logger.error(`Hesap senkronizasyonu başarısız: ${account.iban} — ${err.message}`);
      }
    }
  }

  /**
   * Belirli bir banka hesabını manuel olarak senkronize eder (API üzerinden tetikleme)
   */
  async syncAccount(bankAccountId: string, tenantId: string, providerAccountId?: string | null) {
    this.logger.log(`Hesap senkronize ediliyor: ${bankAccountId}`);

    let mt940Content: string;

    if (this.isMock) {
      // Credentials yoksa örnek MT940 verisi kullan
      mt940Content = this.getMockMt940();
    } else {
      mt940Content = await this.fetchFromKolayBi(providerAccountId || bankAccountId);
    }

    const statement = this.mt940Parser.parse(mt940Content);
    let newTxCount = 0;

    for (const tx of statement.transactions) {
      // Aynı referans numarasıyla hareket zaten varsa atla (UPSERT benzeri)
      const existing = await this.prisma.bankTransaction.findFirst({
        where: {
          bankAccountId,
          referenceNumber: tx.reference,
          transactionDate: tx.date,
        },
      });

      if (existing) continue;

      await this.prisma.bankTransaction.create({
        data: {
          tenantId,
          bankAccountId,
          transactionDate: tx.date,
          valueDate: tx.valueDate,
          amount: tx.amount.toNumber(),
          currency: tx.currency,
          description: tx.description,
          referenceNumber: tx.reference,
          type: tx.type as BankTransactionType,
          mt940Raw: tx.rawLine,
        },
      });

      newTxCount++;
    }

    // Son senkronizasyon zamanını güncelle
    await this.prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: { lastSyncedAt: new Date() },
    });

    this.logger.log(`Senkronizasyon tamamlandı: ${newTxCount} yeni hareket kaydedildi`);
    return { synced: newTxCount, total: statement.transactions.length };
  }

  private async fetchFromKolayBi(accountId: string): Promise<string> {
    const response = await firstValueFrom(
      this.httpService.get(`${this.kolayBiBaseUrl}/bank-accounts/${accountId}/mt940`, {
        headers: { Authorization: `Bearer ${this.kolayBiToken}` },
        timeout: 20000,
      })
    );
    return response.data?.mt940Content || response.data;
  }

  /** Geliştirme ortamı mock MT940 ekstresi */
  private getMockMt940(): string {
    return [
      ':20:EXPECTION-TEST',
      ':25:TR12 0006 2000 1050 0000 0000 26',
      ':28C:1/1',
      ':60F:C240328TRY100000,00',
      ':61:240328C5900,00NTRFEXP-INV-001',
      ':86:EXPECTION INV-001 Nolu Fatura Tahsilatı',
      ':61:240328D1180,00NTRFKIRA-2024-03',
      ':86:Mart Kirası Ödemesi',
      ':62F:C240328TRY104720,00',
    ].join('\n');
  }
}
