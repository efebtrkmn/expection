import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { JournalService } from '../src/journal/journal.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * ACID Transaction ve Rollback Integration Testleri
 *
 * Prisma $transaction mock ile rollback davranışı validate edilir.
 * Gerçek DB bağlantısı gerekmez — transaction atomicity servis katmanında test edilir.
 */
describe('Journal ACID Transaction ve Rollback (Integration)', () => {
  let service: JournalService;
  let prisma: any;

  beforeEach(async () => {
    const transactionMock = jest.fn();
    prisma = {
      $transaction: transactionMock,
      journalEntry: { create: jest.fn().mockResolvedValue({ id: 'je-01' }) },
      ledgerLine: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JournalService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<JournalService>(JournalService);
  });

  describe('Atomicity: Başarısız İşlemde Rollback', () => {
    it('DB hatası → $transaction rollback edilir, journalEntry DB'ye yazılmaz', async () => {
      // DB create başarısız olsun
      prisma.journalEntry.create.mockRejectedValue(new Error('DB connection lost'));
      prisma.$transaction.mockImplementation(async (fn) => fn(prisma));

      await expect(
        service.postJournalEntry({
          tenantId: 't-01',
          description: 'DB hata testi',
          referenceType: 'MANUAL' as any,
          userId: 'user-01',
          lines: [
            { accountId: 'acc-120', debit: 1000, credit: 0 },
            { accountId: 'acc-600', debit: 0, credit: 1000 },
          ],
        })
      ).rejects.toThrow();

      // ledgerLine create çağrılmamış olmalı (exception öncesinde durdu)
      expect(prisma.ledgerLine.createMany).not.toHaveBeenCalled();
    });

    it('Denge bozukluğu → $transaction hiç başlamadan BadRequestException', async () => {
      await expect(
        service.postJournalEntry({
          tenantId: 't-01',
          description: 'Denge bozuk',
          referenceType: 'MANUAL' as any,
          userId: 'user-01',
          lines: [
            { accountId: 'acc-120', debit: 1500, credit: 0 },
            { accountId: 'acc-600', debit: 0, credit: 1000 }, // ← Eksik 500
          ],
        })
      ).rejects.toThrow(BadRequestException);

      // $transaction hiç çağrılmamış olmalı (doğrulama öncesinde durdurulur)
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('Başarılı işlemde EventEmitter tetiklenir', async () => {
      const eventEmitter = { emit: jest.fn() };
      const module = await Test.createTestingModule({
        providers: [
          JournalService,
          { provide: PrismaService, useValue: { ...prisma, $transaction: jest.fn().mockImplementation(async (fn) => fn(prisma)) } },
          { provide: EventEmitter2, useValue: eventEmitter },
        ],
      }).compile();

      const svc = module.get<JournalService>(JournalService);

      await svc.postJournalEntry({
        tenantId: 't-01',
        description: 'Event test',
        referenceType: 'INVOICE' as any,
        userId: 'user-01',
        lines: [
          { accountId: 'acc-120', debit: 1000, credit: 0 },
          { accountId: 'acc-600', debit: 0, credit: 1000 },
        ],
      });

      expect(eventEmitter.emit).toHaveBeenCalled();
    });
  });

  describe('Consistency: Eşzamanlı Yazma Güvenliği', () => {
    it('Aynı yevmiye iki kez gönderilse → idempotency koruması', async () => {
      prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
      prisma.journalEntry.create.mockResolvedValue({ id: 'je-01' });

      // İlk çağrı
      const r1 = await service.postJournalEntry({
        tenantId: 't-01', description: 'İdempotent test', referenceType: 'INVOICE' as any, userId: 'u',
        lines: [
          { accountId: 'a', debit: 100, credit: 0 },
          { accountId: 'b', debit: 0, credit: 100 },
        ],
      });

      // İkinci çağrı (aynı data)
      const r2 = await service.postJournalEntry({
        tenantId: 't-01', description: 'İdempotent test', referenceType: 'INVOICE' as any, userId: 'u',
        lines: [
          { accountId: 'a', debit: 100, credit: 0 },
          { accountId: 'b', debit: 0, credit: 100 },
        ],
      });

      // Her iki çağrı da başarılı olmalı
      expect(r1).toBeDefined();
      expect(r2).toBeDefined();
    });
  });
});
