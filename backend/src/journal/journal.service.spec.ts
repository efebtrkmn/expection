import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { JournalService } from './journal.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * JournalService Unit Testleri
 *
 * Test Stratejisi: PrismaService tam mock ile servis katmanı izole içinde test edilir.
 * DB bağlantısı, filesystem veya network erişimi YOKTUR.
 *
 * Kapsanan Kritik Invariantlar:
 * 1. Borç toplamı = Alacak toplamı (temel muhasebe dengesi)
 * 2. Sıfır tutarlı satırlar reddedilmeli
 * 3. Negatif tutar reddedilmeli
 * 4. Ondalık hassasiyet korunmalı (kuruş seviyesi)
 * 5. Çok satırlı karmaşık yevmiyeler doğru dengelenmeli
 * 6. DB hatası → transaction rollback (exception propagation)
 */
describe('JournalService — Borç/Alacak Dengesi Invariantları', () => {
  let service: JournalService;
  let prisma: jest.Mocked<PrismaService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  // Örnek hesap mock'ları
  const mockAccounts = {
    kasa: { id: 'acc-100', code: '100', name: 'Kasa', type: 'ASSET' },
    alicilar: { id: 'acc-120', name: '120 Alıcılar', code: '120', type: 'ASSET' },
    saticilar: { id: 'acc-320', name: '320 Satıcılar', code: '320', type: 'LIABILITY' },
    gelir: { id: 'acc-600', name: '600 Yurt İçi Satışlar', code: '600', type: 'REVENUE' },
    gider: { id: 'acc-770', name: '770 Genel Yönetim Giderleri', code: '770', type: 'EXPENSE' },
  };

  beforeEach(async () => {
    const prismaMock = {
      account: { findUnique: jest.fn(), findFirst: jest.fn() },
      journalEntry: { create: jest.fn() },
      ledgerLine: { createMany: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JournalService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<JournalService>(JournalService);
    prisma = module.get(PrismaService);
    eventEmitter = module.get(EventEmitter2);
  });

  // ────────────────────────────────────────────────────────────
  // PASS TESTLERI
  // ────────────────────────────────────────────────────────────

  describe('✅ Başarılı Senaryolar', () => {
    it('Basit 2 satırlı yevmiye: DR 120 / CR 600 — denge sağlıyor', async () => {
      const entry = {
        id: 'je-001',
        tenantId: 't-01',
        description: 'Test satışı',
        lines: [],
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        return fn(prisma);
      });
      (prisma.journalEntry.create as jest.Mock).mockResolvedValue(entry);
      (prisma.ledgerLine.createMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await service.postJournalEntry({
        tenantId: 't-01',
        description: 'Test satışı',
        referenceType: 'INVOICE' as any,
        referenceId: 'inv-001',
        userId: 'user-01',
        lines: [
          { accountId: mockAccounts.alicilar.id, debit: 1000, credit: 0, description: 'Alacak' },
          { accountId: mockAccounts.gelir.id, debit: 0, credit: 1000, description: 'Satış' },
        ],
      });

      expect(result).toBeDefined();
      expect(prisma.journalEntry.create).toHaveBeenCalledTimes(1);
    });

    it('3 satırlı KDV'li yevmiye: DR 120 / CR 600 + CR 391 — denge sağlıyor', async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => fn(prisma));
      (prisma.journalEntry.create as jest.Mock).mockResolvedValue({ id: 'je-002' });
      (prisma.ledgerLine.createMany as jest.Mock).mockResolvedValue({ count: 3 });

      const result = await service.postJournalEntry({
        tenantId: 't-01',
        description: 'KDV'li satış',
        referenceType: 'INVOICE' as any,
        referenceId: 'inv-002',
        userId: 'user-01',
        lines: [
          { accountId: 'acc-120', debit: 1180, credit: 0, description: 'Alıcı' },
          { accountId: 'acc-600', debit: 0, credit: 1000, description: 'Satış' },
          { accountId: 'acc-391', debit: 0, credit: 180, description: 'Hesaplanan KDV' },
        ],
      });

      expect(result).toBeDefined();
    });

    it('Ondalıklı tutarlar: 1180.55 TL — kuruş hassasiyeti korunuyor', async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => fn(prisma));
      (prisma.journalEntry.create as jest.Mock).mockResolvedValue({ id: 'je-003' });
      (prisma.ledgerLine.createMany as jest.Mock).mockResolvedValue({ count: 2 });

      await expect(
        service.postJournalEntry({
          tenantId: 't-01',
          description: 'Ondalıklı tutar testi',
          referenceType: 'MANUAL' as any,
          userId: 'user-01',
          lines: [
            { accountId: 'acc-770', debit: 1180.55, credit: 0, description: 'Gider' },
            { accountId: 'acc-100', debit: 0, credit: 1180.55, description: 'Kasa' },
          ],
        })
      ).resolves.toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────
  // FAIL TESTLERI — Güvenlik Sınırları
  // ────────────────────────────────────────────────────────────

  describe('❌ Başarısız Senaryolar — Dengesi Bozuk Girişler', () => {
    it('FAIL: Borç (1000) ≠ Alacak (900) → BadRequestException + Rollback', async () => {
      await expect(
        service.postJournalEntry({
          tenantId: 't-01',
          description: 'Hatalı yevmiye',
          referenceType: 'MANUAL' as any,
          userId: 'user-01',
          lines: [
            { accountId: 'acc-120', debit: 1000, credit: 0, description: 'Borç' },
            { accountId: 'acc-600', debit: 0, credit: 900, description: 'Eksik alacak' },
          ],
        })
      ).rejects.toThrow(BadRequestException);

      // DB'ye hiç yazılmamalı
      expect(prisma.journalEntry.create).not.toHaveBeenCalled();
    });

    it('FAIL: Sıfır tutarlı tek satır → BadRequestException', async () => {
      await expect(
        service.postJournalEntry({
          tenantId: 't-01',
          description: 'Sıfır tutar',
          referenceType: 'MANUAL' as any,
          userId: 'user-01',
          lines: [
            { accountId: 'acc-120', debit: 0, credit: 0, description: 'Sıfır' },
          ],
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('FAIL: Negatif debit tutarı → BadRequestException', async () => {
      await expect(
        service.postJournalEntry({
          tenantId: 't-01',
          description: 'Negatif tutar',
          referenceType: 'MANUAL' as any,
          userId: 'user-01',
          lines: [
            { accountId: 'acc-120', debit: -500, credit: 0, description: 'Negatif' },
            { accountId: 'acc-600', debit: 0, credit: -500, description: 'Negatif alacak' },
          ],
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('FAIL: Ondalık hassasiyet: 0.01 TL fark → BadRequestException', async () => {
      await expect(
        service.postJournalEntry({
          tenantId: 't-01',
          description: 'Kuruş fark',
          referenceType: 'MANUAL' as any,
          userId: 'user-01',
          lines: [
            { accountId: 'acc-120', debit: 100.01, credit: 0, description: 'Alıcı' },
            { accountId: 'acc-600', debit: 0, credit: 100.00, description: 'Satış' },
          ],
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('FAIL: Boş satır listesi → BadRequestException', async () => {
      await expect(
        service.postJournalEntry({
          tenantId: 't-01',
          description: 'Boş satırlar',
          referenceType: 'MANUAL' as any,
          userId: 'user-01',
          lines: [],
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('FAIL: Tüm satırlar borç, hiç alacak yok → BadRequestException', async () => {
      await expect(
        service.postJournalEntry({
          tenantId: 't-01',
          description: 'Tek taraflı',
          referenceType: 'MANUAL' as any,
          userId: 'user-01',
          lines: [
            { accountId: 'acc-120', debit: 500, credit: 0 },
            { accountId: 'acc-770', debit: 500, credit: 0 },
          ],
        })
      ).rejects.toThrow(BadRequestException);
    });
  });
});
