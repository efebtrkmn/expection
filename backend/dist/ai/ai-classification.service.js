"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AiClassificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiClassificationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const journal_service_1 = require("../journal/journal.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const client_1 = require("@prisma/client");
let AiClassificationService = AiClassificationService_1 = class AiClassificationService {
    constructor(prisma, journalService, eventEmitter, config) {
        this.prisma = prisma;
        this.journalService = journalService;
        this.eventEmitter = eventEmitter;
        this.config = config;
        this.logger = new common_1.Logger(AiClassificationService_1.name);
        this.geminiApiKey = config.get('GEMINI_API_KEY', '');
        this.geminiModel = config.get('GEMINI_MODEL', 'gemini-1.5-flash');
        this.confidenceThreshold = config.get('AI_CONFIDENCE_THRESHOLD', 90);
    }
    async classify(dto, tenantId, userId) {
        this.logger.log(`AI sınıflandırma: "${dto.inputText.substring(0, 60)}..."`);
        const accounts = await this.prisma.account.findMany({
            where: { tenantId, isActive: true },
            select: { code: true, name: true, type: true },
            orderBy: { code: 'asc' },
        });
        const aiResult = await this.callGemini(dto.inputText, accounts);
        const suggestedAccount = await this.prisma.account.findFirst({
            where: { tenantId, code: { startsWith: aiResult.accountCode.substring(0, 3) } },
        });
        const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
        const threshold = settings?.aiConfidenceThreshold ?? this.confidenceThreshold;
        const isAutoApproved = aiResult.confidence >= threshold;
        const status = isAutoApproved
            ? client_1.AiClassificationStatus.AUTO_APPROVED
            : client_1.AiClassificationStatus.PENDING_REVIEW;
        const queueEntry = await this.prisma.aiClassificationQueue.create({
            data: {
                tenantId,
                inputText: dto.inputText,
                inputType: dto.inputType || client_1.AiInputType.MANUAL_ENTRY,
                suggestedAccountId: suggestedAccount?.id,
                suggestedAccountCode: aiResult.accountCode,
                suggestedAccountName: aiResult.accountName,
                confidenceScore: aiResult.confidence,
                aiReasoning: aiResult.reasoning,
                aiRawResponse: aiResult.rawResponse,
                referenceId: dto.referenceId,
                status,
            },
        });
        if (isAutoApproved && suggestedAccount) {
            await this.autoPostJournalEntry(queueEntry.id, tenantId, userId, suggestedAccount, dto);
        }
        else {
            this.eventEmitter.emit('ai.review_required', {
                tenantId,
                queueId: queueEntry.id,
                inputText: dto.inputText,
                suggestedCode: aiResult.accountCode,
                confidence: aiResult.confidence,
            });
            this.logger.log(`AI PENDING_REVIEW: confidence=${aiResult.confidence}% < ${threshold}% threshold`);
        }
        return {
            queueId: queueEntry.id,
            suggestedAccountCode: aiResult.accountCode,
            suggestedAccountName: aiResult.accountName,
            confidence: aiResult.confidence,
            reasoning: aiResult.reasoning,
            status,
            autoApproved: isAutoApproved,
            requiresHumanReview: !isAutoApproved,
        };
    }
    async classifyBankTransaction(bankTxId, tenantId, userId) {
        const tx = await this.prisma.bankTransaction.findFirst({
            where: { id: bankTxId, tenantId },
        });
        if (!tx)
            throw new Error('Banka hareketi bulunamadı');
        return this.classify({
            inputText: `${tx.description || ''} ${tx.referenceNumber || ''}`.trim(),
            inputType: 'BANK_TX',
            referenceId: tx.id,
        }, tenantId, userId);
    }
    async getStats(tenantId) {
        const total = await this.prisma.aiClassificationQueue.count({ where: { tenantId } });
        const autoApproved = await this.prisma.aiClassificationQueue.count({
            where: { tenantId, status: client_1.AiClassificationStatus.AUTO_APPROVED },
        });
        const humanApproved = await this.prisma.aiClassificationQueue.count({
            where: { tenantId, status: client_1.AiClassificationStatus.HUMAN_APPROVED },
        });
        const rejected = await this.prisma.aiClassificationQueue.count({
            where: { tenantId, status: client_1.AiClassificationStatus.REJECTED },
        });
        const pending = await this.prisma.aiClassificationQueue.count({
            where: { tenantId, status: client_1.AiClassificationStatus.PENDING_REVIEW },
        });
        const avgConfidence = await this.prisma.aiClassificationQueue.aggregate({
            where: { tenantId },
            _avg: { confidenceScore: true },
        });
        return {
            total,
            autoApproved,
            humanApproved,
            rejected,
            pending,
            autoApprovalRate: total > 0 ? Math.round((autoApproved / total) * 100) : 0,
            avgConfidence: Number(avgConfidence._avg.confidenceScore || 0).toFixed(1),
        };
    }
    async callGemini(inputText, accounts) {
        if (!this.geminiApiKey) {
            this.logger.warn('GEMINI_API_KEY ayarlanmamış — mock yanıt döndürülüyor');
            return this.getMockClassification(inputText);
        }
        try {
            const { GoogleGenerativeAI } = await Promise.resolve().then(() => require('@google/generative-ai'));
            const genai = new GoogleGenerativeAI(this.geminiApiKey);
            const model = genai.getGenerativeModel({
                model: this.geminiModel,
                generationConfig: { responseMimeType: 'application/json' },
            });
            const accountList = accounts
                .slice(0, 50)
                .map(a => `${a.code}: ${a.name}`)
                .join('\n');
            const prompt = `Sen deneyimli bir Türk muhasebe uzmanısın ve Türkiye Tekdüzen Hesap Planı (THP) konusunda uzmansın.

Aşağıdaki gider açıklamasını analiz et ve en uygun THP hesap kodunu belirle.

GIDER AÇIKLAMASI:
"${inputText}"

MEVCUT HESAP PLANI:
${accountList || '770: Genel Yönetim Giderleri\n760: Pazarlama Giderleri\n750: Araştırma Geliştirme\n100: Kasa\n120: Alıcılar\n320: Satıcılar\n600: Yurt İçi Satışlar'}

Analiz sonucunu YALNIZCA şu JSON formatında ver:
{
  "accountCode": "770",
  "accountName": "Genel Yönetim Giderleri",
  "confidence": 87.5,
  "reasoning": "Kırtasiye malzemeleri genel yönetim giderleri kapsamındadır çünkü..."
}

Önemli kurallar:
- confidence: 0 ile 100 arasında ondalıklı sayı
- Emin olmadığında daha düşük confidence ver
- reasoning: Türkçe, kısa ve net açıklama`;
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const parsed = JSON.parse(text);
            return {
                accountCode: String(parsed.accountCode || '770'),
                accountName: parsed.accountName || 'Belirsiz Hesap',
                confidence: Math.min(100, Math.max(0, Number(parsed.confidence || 50))),
                reasoning: parsed.reasoning || '',
                rawResponse: parsed,
            };
        }
        catch (err) {
            this.logger.error(`Gemini API hatası: ${err.message}`);
            return this.getMockClassification(inputText);
        }
    }
    getMockClassification(inputText) {
        const lower = inputText.toLowerCase();
        const rules = [
            { keywords: ['kırtasiye', 'ofis', 'kalem', 'kağıt', 'zımba'], code: '770', name: 'Genel Yönetim Giderleri', confidence: 92.5 },
            { keywords: ['elektrik', 'su', 'doğalgaz', 'fatura', 'enerji'], code: '770', name: 'Genel Yönetim Giderleri', confidence: 88.0 },
            { keywords: ['reklam', 'tanıtım', 'pazarlama', 'sosyal medya'], code: '760', name: 'Pazarlama Satış Dağıtım Giderleri', confidence: 91.0 },
            { keywords: ['yazılım', 'abonelik', 'saas', 'lisans', 'program'], code: '770', name: 'Genel Yönetim Giderleri', confidence: 85.5 },
            { keywords: ['kira', 'kiralamak', 'ofis kirası'], code: '770', name: 'Genel Yönetim Giderleri', confidence: 94.0 },
            { keywords: ['maaş', 'ücret', 'personel', 'sgk', 'bordro'], code: '720', name: 'Genel Yönetim Giderleri', confidence: 96.0 },
            { keywords: ['yakıt', 'benzin', 'motorin', 'araç'], code: '770', name: 'Genel Yönetim Giderleri', confidence: 83.0 },
        ];
        for (const rule of rules) {
            if (rule.keywords.some(k => lower.includes(k))) {
                return { accountCode: rule.code, accountName: rule.name, confidence: rule.confidence, reasoning: `"${inputText}" metni "${rule.name}" (${rule.code}) kapsamındadır. [MOCK]`, rawResponse: { mock: true } };
            }
        }
        return { accountCode: '770', accountName: 'Genel Yönetim Giderleri', confidence: 55.0, reasoning: 'Kesin sınıflandırma yapılamadı, genel yönetim giderleri öneriliyor. [MOCK]', rawResponse: { mock: true } };
    }
    async autoPostJournalEntry(queueId, tenantId, userId, account, dto) {
        try {
            const cashAccount = await this.prisma.account.findFirst({
                where: { tenantId, code: { startsWith: '100' }, isActive: true },
            });
            if (!cashAccount)
                return;
            const entry = await this.journalService.postJournalEntry({
                entryNumber: `AI-A-${Date.now()}`,
                entryDate: new Date().toISOString(),
                description: `AI Otomatik Sınıflandırma: ${dto.inputText.substring(0, 100)}`,
                referenceType: client_1.JournalReferenceType.MANUAL,
                referenceId: dto.referenceId,
                lines: [
                    { accountId: account.id, debit: 0, credit: 100, description: dto.inputText.substring(0, 200) },
                    { accountId: cashAccount.id, debit: 100, credit: 0, description: 'Otomatik AI tahsisi' },
                ],
            }, tenantId, userId);
            await this.prisma.aiClassificationQueue.update({
                where: { id: queueId },
                data: { journalEntryId: entry.id, reviewedAt: new Date() },
            });
            this.logger.log(`AI AUTO_APPROVED → Yevmiye oluşturuldu: ${account.code}`);
        }
        catch (err) {
            this.logger.error(`AI otomatik yevmiye hatası: ${err.message}`);
        }
    }
};
exports.AiClassificationService = AiClassificationService;
exports.AiClassificationService = AiClassificationService = AiClassificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        journal_service_1.JournalService,
        event_emitter_1.EventEmitter2,
        config_1.ConfigService])
], AiClassificationService);
//# sourceMappingURL=ai-classification.service.js.map