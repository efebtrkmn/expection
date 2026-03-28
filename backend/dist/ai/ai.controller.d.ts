import { AiClassificationService } from './ai-classification.service';
import { AiApprovalService } from './ai-approval.service';
import { ClassifyExpenseDto, ReviewClassificationDto } from './dto/classify-expense.dto';
import { AiClassificationStatus } from '@prisma/client';
export declare class AiController {
    private readonly classificationService;
    private readonly approvalService;
    constructor(classificationService: AiClassificationService, approvalService: AiApprovalService);
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
    classifyBankTx(id: string, tenantId: string, userId: string): Promise<{
        queueId: string;
        suggestedAccountCode: string;
        suggestedAccountName: string;
        confidence: number;
        reasoning: string;
        status: "AUTO_APPROVED" | "PENDING_REVIEW";
        autoApproved: boolean;
        requiresHumanReview: boolean;
    }>;
    getQueue(tenantId: string, status?: AiClassificationStatus): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.AiClassificationStatus;
        createdAt: Date;
        tenantId: string;
        journalEntryId: string | null;
        referenceId: string | null;
        inputText: string;
        inputType: import(".prisma/client").$Enums.AiInputType;
        suggestedAccountId: string | null;
        suggestedAccountCode: string | null;
        suggestedAccountName: string | null;
        confidenceScore: import("@prisma/client/runtime/library").Decimal;
        aiReasoning: string | null;
        aiRawResponse: import("@prisma/client/runtime/library").JsonValue | null;
        reviewedByUserId: string | null;
        reviewNote: string | null;
        reviewedAt: Date | null;
    }[]>;
    getStats(tenantId: string): Promise<{
        total: number;
        autoApproved: number;
        humanApproved: number;
        rejected: number;
        pending: number;
        autoApprovalRate: number;
        avgConfidence: string;
    }>;
    approve(id: string, dto: ReviewClassificationDto, tenantId: string, userId: string): Promise<{
        approved: boolean;
        accountCode: string;
        accountName: string;
        journalEntryId: string;
        aiWasCorrect: boolean;
    }>;
    reject(id: string, dto: ReviewClassificationDto, tenantId: string, userId: string): Promise<{
        rejected: boolean;
        note: string;
    }>;
}
