import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { JournalService } from '../journal/journal.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClassifyExpenseDto } from './dto/classify-expense.dto';
export declare class AiClassificationService {
    private readonly prisma;
    private readonly journalService;
    private readonly eventEmitter;
    private readonly config;
    private readonly logger;
    private readonly geminiApiKey;
    private readonly geminiModel;
    private readonly confidenceThreshold;
    constructor(prisma: PrismaService, journalService: JournalService, eventEmitter: EventEmitter2, config: ConfigService);
    classify(dto: ClassifyExpenseDto, tenantId: string, userId: string): Promise<{
        queueId: string;
        suggestedAccountCode: string;
        suggestedAccountName: string;
        confidence: number;
        reasoning: string;
        status: "AUTO_APPROVED" | "PENDING_REVIEW";
        autoApproved: boolean;
        requiresHumanReview: boolean;
    }>;
    classifyBankTransaction(bankTxId: string, tenantId: string, userId: string): Promise<{
        queueId: string;
        suggestedAccountCode: string;
        suggestedAccountName: string;
        confidence: number;
        reasoning: string;
        status: "AUTO_APPROVED" | "PENDING_REVIEW";
        autoApproved: boolean;
        requiresHumanReview: boolean;
    }>;
    getStats(tenantId: string): Promise<{
        total: number;
        autoApproved: number;
        humanApproved: number;
        rejected: number;
        pending: number;
        autoApprovalRate: number;
        avgConfidence: string;
    }>;
    private callGemini;
    private getMockClassification;
    private autoPostJournalEntry;
}
