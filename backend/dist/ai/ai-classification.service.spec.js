"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const ai_classification_service_1 = require("./ai-classification.service");
const prisma_service_1 = require("../prisma/prisma.service");
const journal_service_1 = require("../journal/journal.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const config_1 = require("@nestjs/config");
describe('AiClassificationService — Güven Eşiği ve Hibrid Onay Mantığı', () => {
    let service;
    let prisma;
    let journalService;
    let eventEmitter;
    let configService;
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
            get: jest.fn((key, def) => {
                const map = {
                    GEMINI_API_KEY: '',
                    GEMINI_MODEL: 'gemini-1.5-flash',
                    AI_CONFIDENCE_THRESHOLD: 90,
                };
                return map[key] ?? def;
            }),
        };
        journalService = { postJournalEntry: jest.fn().mockResolvedValue({ id: 'je-01' }) };
        eventEmitter = { emit: jest.fn() };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                ai_classification_service_1.AiClassificationService,
                { provide: prisma_service_1.PrismaService, useValue: prisma },
                { provide: journal_service_1.JournalService, useValue: journalService },
                { provide: event_emitter_1.EventEmitter2, useValue: eventEmitter },
                { provide: config_1.ConfigService, useValue: configService },
            ],
        }).compile();
        service = module.get(ai_classification_service_1.AiClassificationService);
    });
    describe('Mock Fallback (API Key yok)', () => {
        it('Kırtasiye açıklaması → 770 kodu, yüksek confidence', async () => {
            const result = await service.classify({ inputText: 'Kırtasiye A.Ş. ofis malzemesi kalem kağıt' }, 't-01', 'user-01');
            expect(result.suggestedAccountCode).toBe('770');
            expect(result.confidence).toBeGreaterThan(50);
        });
        it('Reklam açıklaması → 760 kodu önerilmeli', async () => {
            const result = await service.classify({ inputText: 'Instagram Reklam Tanıtım Kampanyası' }, 't-01', 'user-01');
            expect(result.suggestedAccountCode).toBe('760');
            expect(result.confidence).toBeGreaterThan(50);
        });
        it('Bilinmeyen açıklama → 770 fallback, düşük confidence', async () => {
            const result = await service.classify({ inputText: 'xyz123 belirsiz işlem kaydı' }, 't-01', 'user-01');
            expect(result.suggestedAccountCode).toBeDefined();
            expect(result.confidence).toBeLessThan(80);
        });
    });
    describe('Hibrid Onay Akışı: %90 Eşik Kararları', () => {
        it('confidence >= 90 → AUTO_APPROVED + yevmiye oluşturulur', async () => {
            const result = await service.classify({ inputText: 'Kira bedeli aylık ofis kirası' }, 't-01', 'user-01');
            expect(result.autoApproved).toBe(true);
            expect(result.status).toBe('AUTO_APPROVED');
            expect(result.requiresHumanReview).toBe(false);
        });
        it('confidence < 90 → PENDING_REVIEW + WebSocket bildirimi tetiklenir', async () => {
            const result = await service.classify({ inputText: 'xyz belirsiz ödeme' }, 't-01', 'user-01');
            expect(result.autoApproved).toBe(false);
            expect(result.status).toBe('PENDING_REVIEW');
            expect(result.requiresHumanReview).toBe(true);
            expect(eventEmitter.emit).toHaveBeenCalledWith('ai.review_required', expect.objectContaining({
                tenantId: 't-01',
            }));
        });
        it('AUTO_APPROVED → JournalService.postJournalEntry çağrılır', async () => {
            await service.classify({ inputText: 'Aylık ofis kirası ödeme' }, 't-01', 'user-01');
            expect(journalService.postJournalEntry).toHaveBeenCalled();
        });
        it('PENDING_REVIEW → JournalService çağrılmaz', async () => {
            await service.classify({ inputText: 'belirsiz ödeme' }, 't-01', 'user-01');
            expect(journalService.postJournalEntry).not.toHaveBeenCalled();
        });
    });
    describe('İstatistik Hesaplama', () => {
        it('getStats → oran ve sayılar doğru hesaplanıyor', async () => {
            prisma.aiClassificationQueue.count
                .mockResolvedValueOnce(100)
                .mockResolvedValueOnce(75)
                .mockResolvedValueOnce(15)
                .mockResolvedValueOnce(5)
                .mockResolvedValueOnce(5);
            const stats = await service.getStats('t-01');
            expect(stats.total).toBe(100);
            expect(stats.autoApprovalRate).toBe(75);
            expect(stats.avgConfidence).toBeDefined();
        });
    });
});
//# sourceMappingURL=ai-classification.service.spec.js.map