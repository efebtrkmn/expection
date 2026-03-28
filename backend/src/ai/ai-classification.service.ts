import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { JournalService } from '../journal/journal.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AiClassificationStatus, AiInputType, JournalReferenceType } from '@prisma/client';
import { ClassifyExpenseDto } from './dto/classify-expense.dto';
import { Decimal } from 'decimal.js';

/**
 * Gemini AI destekli gider sınıflandırma motoru.
 *
 * Model: gemini-1.5-flash (hızlı, maliyet-etkin)
 * Prompt: Türkçe THP (Tekdüzen Hesap Planı) odaklı
 * JSON Mode: Hallucination riskini minimize eder
 * Hibrit Akış: confidence >= threshold → AUTO, < threshold → PENDING_REVIEW
 */
@Injectable()
export class AiClassificationService {
  private readonly logger = new Logger(AiClassificationService.name);
  private readonly geminiApiKey: string;
  private readonly geminiModel: string;
  private readonly confidenceThreshold: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly journalService: JournalService,
    private readonly eventEmitter: EventEmitter2,
    private readonly config: ConfigService,
  ) {
    this.geminiApiKey = config.get<string>('GEMINI_API_KEY', '');
    this.geminiModel = config.get<string>('GEMINI_MODEL', 'gemini-1.5-flash');
    this.confidenceThreshold = config.get<number>('AI_CONFIDENCE_THRESHOLD', 90);
  }

  /**
   * Ana sınıflandırma metodu.
   * 1. Gemini'ye sorar → JSON yanıt alır
   * 2. Güven skoruna göre otomatik onay veya inceleme kuyruğu
   */
  async classify(dto: ClassifyExpenseDto, tenantId: string, userId: string) {
    this.logger.log(`AI sınıflandırma: "${dto.inputText.substring(0, 60)}..."`);

    // Tenant için mevcut hesap listesini al (Gemini'ye context vermek için)
    const accounts = await this.prisma.account.findMany({
      where: { tenantId, isActive: true },
      select: { code: true, name: true, type: true },
      orderBy: { code: 'asc' },
    });

    // AI Tahmin
    const aiResult = await this.callGemini(dto.inputText, accounts);

    // Önerilen hesabı DB'den bul
    const suggestedAccount = await this.prisma.account.findFirst({
      where: { tenantId, code: { startsWith: aiResult.accountCode.substring(0, 3) } },
    });

    // Tenant'ın güven eşiğini kontrol et (DB'den veya global default)
    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
    const threshold = (settings as any)?.aiConfidenceThreshold ?? this.confidenceThreshold;

    const isAutoApproved = aiResult.confidence >= threshold;
    const status = isAutoApproved
      ? AiClassificationStatus.AUTO_APPROVED
      : AiClassificationStatus.PENDING_REVIEW;

    // Kuyruğa kaydet
    const queueEntry = await this.prisma.aiClassificationQueue.create({
      data: {
        tenantId,
        inputText: dto.inputText,
        inputType: (dto.inputType as AiInputType) || AiInputType.MANUAL_ENTRY,
        suggestedAccountId: suggestedAccount?.id,
        suggestedAccountCode: aiResult.accountCode,
        suggestedAccountName: aiResult.accountName,
        confidenceScore: aiResult.confidence,
        aiReasoning: aiResult.reasoning,
        aiRawResponse: aiResult.rawResponse as any,
        referenceId: dto.referenceId,
        status,
      },
    });

    // Otomatik onaysa: Yevmiye oluştur
    if (isAutoApproved && suggestedAccount) {
      await this.autoPostJournalEntry(queueEntry.id, tenantId, userId, suggestedAccount, dto);
    } else {
      // Admin'e inceleme bildirimi
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

  /**
   * Banka hareketi için özel sınıflandırma (açıklamayı direkt alır)
   */
  async classifyBankTransaction(bankTxId: string, tenantId: string, userId: string) {
    const tx = await this.prisma.bankTransaction.findFirst({
      where: { id: bankTxId, tenantId },
    });
    if (!tx) throw new Error('Banka hareketi bulunamadı');

    return this.classify(
      {
        inputText: `${tx.description || ''} ${tx.referenceNumber || ''}`.trim(),
        inputType: 'BANK_TX' as any,
        referenceId: tx.id,
      },
      tenantId,
      userId,
    );
  }

  /**
   * Sınıflandırma istatistikleri (AI doğruluk oranı)
   */
  async getStats(tenantId: string) {
    const total = await this.prisma.aiClassificationQueue.count({ where: { tenantId } });
    const autoApproved = await this.prisma.aiClassificationQueue.count({
      where: { tenantId, status: AiClassificationStatus.AUTO_APPROVED },
    });
    const humanApproved = await this.prisma.aiClassificationQueue.count({
      where: { tenantId, status: AiClassificationStatus.HUMAN_APPROVED },
    });
    const rejected = await this.prisma.aiClassificationQueue.count({
      where: { tenantId, status: AiClassificationStatus.REJECTED },
    });
    const pending = await this.prisma.aiClassificationQueue.count({
      where: { tenantId, status: AiClassificationStatus.PENDING_REVIEW },
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

  // ─── Özel Metodlar ───────────────────────────────────────────────────────────

  private async callGemini(inputText: string, accounts: any[]): Promise<{
    accountCode: string;
    accountName: string;
    confidence: number;
    reasoning: string;
    rawResponse: any;
  }> {
    if (!this.geminiApiKey) {
      this.logger.warn('GEMINI_API_KEY ayarlanmamış — mock yanıt döndürülüyor');
      return this.getMockClassification(inputText);
    }

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genai = new GoogleGenerativeAI(this.geminiApiKey);
      const model = genai.getGenerativeModel({
        model: this.geminiModel,
        generationConfig: { responseMimeType: 'application/json' },
      });

      const accountList = accounts
        .slice(0, 50) // Token limit için ilk 50 hesap
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
    } catch (err) {
      this.logger.error(`Gemini API hatası: ${err.message}`);
      return this.getMockClassification(inputText);
    }
  }

  private getMockClassification(inputText: string) {
    const lower = inputText.toLowerCase();
    const rules: Array<{ keywords: string[]; code: string; name: string; confidence: number }> = [
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

  private async autoPostJournalEntry(queueId: string, tenantId: string, userId: string, account: any, dto: ClassifyExpenseDto) {
    try {
      // Kasa/Banka hesabı (karşı hesap)
      const cashAccount = await this.prisma.account.findFirst({
        where: { tenantId, code: { startsWith: '100' }, isActive: true },
      });
      if (!cashAccount) return;

      const entry = await this.journalService.postJournalEntry({
        entryNumber: `AI-A-${Date.now()}`,
        entryDate: new Date().toISOString(),
        description: `AI Otomatik Sınıflandırma: ${dto.inputText.substring(0, 100)}`,
        referenceType: JournalReferenceType.MANUAL,
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
    } catch (err) {
      this.logger.error(`AI otomatik yevmiye hatası: ${err.message}`);
    }
  }
}
