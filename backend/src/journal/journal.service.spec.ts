import { Test, TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
import { JournalService } from './journal.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

describe('JournalService - Borc/Alacak Dengesi Invariantlari', () => {
  let service: JournalService;
  let prisma: any;

  const TENANT_ID = 't-01';
  const USER_ID = 'user-01';

  beforeEach(async () => {
    const prismaMock = {
      journalEntry: { create: jest.fn(), findFirst: jest.fn() },
      ledgerLine: { createMany: jest.fn() },
      $transaction: jest.fn(),
      withTenantTransaction: jest.fn(),
    };

    const auditLogMock = {
      logEntityChange: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JournalService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditLogService, useValue: auditLogMock },
      ],
    }).compile();

    service = module.get<JournalService>(JournalService);
    prisma = module.get(PrismaService);
  });

  describe('Basarili Senaryolar', () => {
    it('Basit 2 satirli yevmiye: DR 120 / CR 600 - denge sagliyor', async () => {
      prisma.withTenantTransaction.mockImplementation(async (_tid, fn) => {
        const tx = {
          journalEntry: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'je-001', entryNumber: 'YMM-001' }),
          },
        };
        return fn(tx);
      });

      const result = await service.postJournalEntry({
        entryNumber: 'YMM-001',
        entryDate: new Date().toISOString(),
        description: 'Test satisi',
        referenceType: 'INVOICE' as any,
        referenceId: 'inv-001',
        lines: [
          { accountId: 'acc-120', debit: 1000, credit: 0, description: 'Alacak' },
          { accountId: 'acc-600', debit: 0, credit: 1000, description: 'Satis' },
        ],
      } as any, TENANT_ID, USER_ID);

      expect(result).toBeDefined();
    });

    it('3 satirli KDV yevmiye: DR 120 / CR 600 + CR 391 - denge sagliyor', async () => {
      prisma.withTenantTransaction.mockImplementation(async (_tid, fn) => {
        const tx = {
          journalEntry: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'je-002', entryNumber: 'YMM-002' }),
          },
        };
        return fn(tx);
      });

      const result = await service.postJournalEntry({
        entryNumber: 'YMM-002',
        entryDate: new Date().toISOString(),
        description: 'KDV li satis',
        referenceType: 'INVOICE' as any,
        referenceId: 'inv-002',
        lines: [
          { accountId: 'acc-120', debit: 1180, credit: 0, description: 'Alici' },
          { accountId: 'acc-600', debit: 0, credit: 1000, description: 'Satis' },
          { accountId: 'acc-391', debit: 0, credit: 180, description: 'KDV' },
        ],
      } as any, TENANT_ID, USER_ID);

      expect(result).toBeDefined();
    });

    it('Ondalikli tutarlar: 1180.55 TL - kurus hassasiyeti korunuyor', async () => {
      prisma.withTenantTransaction.mockImplementation(async (_tid, fn) => {
        const tx = {
          journalEntry: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'je-003', entryNumber: 'YMM-003' }),
          },
        };
        return fn(tx);
      });

      await expect(
        service.postJournalEntry({
          entryNumber: 'YMM-003',
          entryDate: new Date().toISOString(),
          description: 'Ondalikli tutar testi',
          referenceType: 'MANUAL' as any,
          lines: [
            { accountId: 'acc-770', debit: 1180.55, credit: 0, description: 'Gider' },
            { accountId: 'acc-100', debit: 0, credit: 1180.55, description: 'Kasa' },
          ],
        } as any, TENANT_ID, USER_ID)
      ).resolves.toBeDefined();
    });
  });

  describe('Basarisiz Senaryolar - Dengesi Bozuk Girisler', () => {
    it('FAIL: Borc 1000 Alacak 900 -> UnprocessableEntityException', async () => {
      await expect(
        service.postJournalEntry({
          entryNumber: 'ERR-001',
          entryDate: new Date().toISOString(),
          description: 'Hatali yevmiye',
          referenceType: 'MANUAL' as any,
          lines: [
            { accountId: 'acc-120', debit: 1000, credit: 0, description: 'Borc' },
            { accountId: 'acc-600', debit: 0, credit: 900, description: 'Eksik alacak' },
          ],
        } as any, TENANT_ID, USER_ID)
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('FAIL: 0.01 TL fark -> UnprocessableEntityException', async () => {
      await expect(
        service.postJournalEntry({
          entryNumber: 'ERR-002',
          entryDate: new Date().toISOString(),
          description: 'Kurus fark',
          referenceType: 'MANUAL' as any,
          lines: [
            { accountId: 'acc-120', debit: 100.01, credit: 0, description: 'Alici' },
            { accountId: 'acc-600', debit: 0, credit: 100.00, description: 'Satis' },
          ],
        } as any, TENANT_ID, USER_ID)
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('FAIL: Tum satirlar borc, hic alacak yok -> UnprocessableEntityException', async () => {
      await expect(
        service.postJournalEntry({
          entryNumber: 'ERR-003',
          entryDate: new Date().toISOString(),
          description: 'Tek tarafli',
          referenceType: 'MANUAL' as any,
          lines: [
            { accountId: 'acc-120', debit: 500, credit: 0 },
            { accountId: 'acc-770', debit: 500, credit: 0 },
          ],
        } as any, TENANT_ID, USER_ID)
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
