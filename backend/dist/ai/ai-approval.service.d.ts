import { PrismaService } from '../prisma/prisma.service';
import { JournalService } from '../journal/journal.service';
import { AiClassificationStatus } from '@prisma/client';
import { ReviewClassificationDto } from './dto/classify-expense.dto';
export declare class AiApprovalService {
    private readonly prisma;
    private readonly journalService;
    private readonly logger;
    constructor(prisma: PrismaService, journalService: JournalService);
    getPendingQueue(tenantId: string): Promise<{
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
    approve(queueId: string, tenantId: string, userId: string, dto: ReviewClassificationDto): Promise<{
        approved: boolean;
        accountCode: string;
        accountName: string;
        journalEntryId: string;
        aiWasCorrect: boolean;
    }>;
    reject(queueId: string, tenantId: string, userId: string, dto: ReviewClassificationDto): Promise<{
        rejected: boolean;
        note: string;
    }>;
    private findEntry;
    private assertPending;
}
