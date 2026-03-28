import { Test, TestingModule } from '@nestjs/testing';
import { AiClassificationService } from './ai-classification.service';
import { PrismaService } from '../prisma/prisma.service';
import { JournalService } from '../journal/journal.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';

/**
 * AI Sınıflandırma Servisi Unit Testleri
 *
 * Gemini API çağrıları mock'lanır — hiçbir ağ erişimi yapılmaz.
 * Güven eşiği karar mantığı ve hibrid akış izole test edilir.
 */
describe('AiClassificationService — Güven Eşiği ve Hibrid Onay Mantığı', () => {
  let service: AiClassificationService;
  let prisma: any;
  let journalService: any;
  let eventEmitter: any;
  let configService: any;

  const baseMockEntry = {
    id: 'queue-01',
    tenantId: 't-01',
    inputText: 'test',
    status: 'PENDING_REVIEW',
    suggestedAccountCode: '770',
    confidenceScore: 75,
  };

  beforeEach(async () => {
    prisma = {
      account: {
        findMany: jest.fn().mockResolvedValue([
          { code: '770', name: 'Genel Yönetim Giderleri', type: 'EXPENSE' },
          { code: '760', name: 'Pazarlama Giderleri', type: 'EXPENSE' },
        ]),
        findFirst: jest.fn().mockResolvedValue({ id: 'acc-770', code: '770', name: 'Genel Yönetim Giderleri' }),
      },
      aiClassificationQueue: {
        create: jest.fn().mockResolvedValue(baseMockEntry),
        update: jest.fn().mockResolvedValue(baseMockEntry),
        count: jest.fn().mockResolvedValue(10),
        aggregate: jest.fn().mockResolvedValue({ _avg: { confidenceScore: 85 } }),
      },
      tenantSettings: { findUnique: jest.fn().mockResolvedValue(null) },
    };

    configService = {
      get: jest.fn((key: string, def: any) => {
        const map: Record<string, any> = {
          GEMINI_API_KEY: '', // API key yok → mock fallback tetiklenecek
          GEMINI_MODEL: 'gemini-1.5-flash',
          AI_CONFIDENCE_THRESHOLD: 90,
        };
        return map[key] ?? def;
      }),
    };

    journalService = { postJournalEntry: jest.fn().mockResolvedValue({ id: 'je-01' }) };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiClassificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: JournalService, useValue: journalService },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AiClassificationService>(AiClassificationService);
  });

  describe('Mock Fallback (API Key yok)', () => {
    it('Kırtasiye açıklaması → 770 kodu, yüksek confidence', async () => {
      const result = await service.classify(
        { inputText: 'Kırtasiye A.Ş. ofis malzemesi kalem kağıt' },
        't-01', 'user-01',
      );

      expect(result.suggestedAccountCode).toBe('770');
      expect(result.confidence).toBeGreaterThan(50);
    });

    it('Reklam açıklaması → 760 kodu önerilmeli', async () => {
      const result = await service.classify(
        { inputText: 'Instagram Reklam Tanıtım Kampanyası' },
        't-01', 'user-01',
      );

      expect(result.suggestedAccountCode).toBe('760');
      expect(result.confidence).toBeGreaterThan(50);
    });

    it('Bilinmeyen açıklama → 770 fallback, düşük confidence', async () => {
      const result = await service.classify(
        { inputText: 'xyz123 belirsiz işlem kaydı' },
        't-01', 'user-01',
      );

      expect(result.suggestedAccountCode).toBeDefined();
      expect(result.confidence).toBeLessThan(80);
    });
  });

  describe('Hibrid Onay Akışı: %90 Eşik Kararları', () => {
    it('confidence >= 90 → AUTO_APPROVED + yevmiye oluşturulur', async () => {
      const result = await service.classify(
        { inputText: 'Kira bedeli aylık ofis kirası' }, // confidence=94
        't-01', 'user-01',
      );

      expect(result.autoApproved).toBe(true);
      expect(result.status).toBe('AUTO_APPROVED');
      expect(result.requiresHumanReview).toBe(false);
    });

    it('confidence < 90 → PENDING_REVIEW + WebSocket bildirimi tetiklenir', async () => {
      const result = await service.classify(
        { inputText: 'xyz belirsiz ödeme' }, // confidence=55
        't-01', 'user-01',
      );

      expect(result.autoApproved).toBe(false);
      expect(result.status).toBe('PENDING_REVIEW');
      expect(result.requiresHumanReview).toBe(true);
      expect(eventEmitter.emit).toHaveBeenCalledWith('ai.review_required', expect.objectContaining({
        tenantId: 't-01',
      }));
    });

    it('AUTO_APPROVED → JournalService.postJournalEntry çağrılır', async () => {
      await service.classify(
        { inputText: 'Aylık ofis kirası ödeme' }, // confidence=94
        't-01', 'user-01',
      );

      expect(journalService.postJournalEntry).toHaveBeenCalled();
    });

    it('PENDING_REVIEW → JournalService çağrılmaz', async () => {
      await service.classify(
        { inputText: 'belirsiz ödeme' },
        't-01', 'user-01',
      );

      expect(journalService.postJournalEntry).not.toHaveBeenCalled();
    });
  });

  describe('İstatistik Hesaplama', () => {
    it('getStats → oran ve sayılar doğru hesaplanıyor', async () => {
      prisma.aiClassificationQueue.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(75)  // autoApproved
        .mockResolvedValueOnce(15)  // humanApproved
        .mockResolvedValueOnce(5)   // rejected
        .mockResolvedValueOnce(5);  // pending

      const stats = await service.getStats('t-01');

      expect(stats.total).toBe(100);
      expect(stats.autoApprovalRate).toBe(75);
      expect(stats.avgConfidence).toBeDefined();
    });
  });
});
