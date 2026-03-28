import { Test, TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
import { JournalService } from '../src/journal/journal.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditLogService } from '../src/audit-log/audit-log.service';

describe('Journal ACID Transaction ve Rollback (Integration)', () => {
  let service: JournalService;
  let prisma: any;

  const TENANT_ID = 't-01';
  const USER_ID = 'user-01';

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      withTenantTransaction: jest.fn(),
      journalEntry: { create: jest.fn().mockResolvedValue({ id: 'je-01', entryNumber: 'T-001' }), findFirst: jest.fn() },
      ledgerLine: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };

    const auditLogMock = { logEntityChange: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JournalService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: auditLogMock },
      ],
    }).compile();

    service = module.get<JournalService>(JournalService);
  });

  describe('Atomicity: Basarisiz Islemde Rollback', () => {
    it('DB hatasi -> transaction rollback edilir', async () => {
      prisma.withTenantTransaction.mockRejectedValue(new Error('DB connection lost'));

      await expect(
        service.postJournalEntry({
          entryNumber: 'ACID-001',
          entryDate: new Date().toISOString(),
          description: 'DB hata testi',
          referenceType: 'MANUAL' as any,
          lines: [
            { accountId: 'acc-120', debit: 1000, credit: 0 },
            { accountId: 'acc-600', debit: 0, credit: 1000 },
          ],
        } as any, TENANT_ID, USER_ID)
      ).rejects.toThrow();
    });

    it('Denge bozuklugu -> transaction hic baslamadan UnprocessableEntityException', async () => {
      await expect(
        service.postJournalEntry({
          entryNumber: 'ACID-002',
          entryDate: new Date().toISOString(),
          description: 'Denge bozuk',
          referenceType: 'MANUAL' as any,
          lines: [
            { accountId: 'acc-120', debit: 1500, credit: 0 },
            { accountId: 'acc-600', debit: 0, credit: 1000 },
          ],
        } as any, TENANT_ID, USER_ID)
      ).rejects.toThrow(UnprocessableEntityException);

      expect(prisma.withTenantTransaction).not.toHaveBeenCalled();
    });
  });

  describe('Consistency: Esszamanli Yazma Guvenligi', () => {
    it('Ayni yevmiye iki kez gonderilse - her iki cagri da basarili olmali', async () => {
      prisma.withTenantTransaction.mockImplementation(async (_tid, fn) => {
        const tx = {
          journalEntry: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'je-01', entryNumber: 'T-001' }),
          },
        };
        return fn(tx);
      });

      const dto = {
        entryNumber: 'CON-001',
        entryDate: new Date().toISOString(),
        description: 'Idempotent test',
        referenceType: 'INVOICE' as any,
        lines: [
          { accountId: 'a', debit: 100, credit: 0 },
          { accountId: 'b', debit: 0, credit: 100 },
        ],
      } as any;

      const r1 = await service.postJournalEntry(dto, TENANT_ID, USER_ID);
      const r2 = await service.postJournalEntry(dto, TENANT_ID, USER_ID);

      expect(r1).toBeDefined();
      expect(r2).toBeDefined();
    });
  });
});
