import { PrismaService } from '../prisma/prisma.service';
export declare class ReconciliationService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    scheduledReconciliation(): Promise<void>;
    manualMatch(txId: string, invoiceId: string, tenantId: string): Promise<{
        matched: boolean;
        invoiceId: string;
        txId: string;
    }>;
    getUnmatchedTransactions(tenantId: string): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        type: import(".prisma/client").$Enums.BankTransactionType;
        currency: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        description: string | null;
        transactionDate: Date;
        referenceNumber: string | null;
        bankAccountId: string;
        valueDate: Date | null;
        mt940Raw: string | null;
        matchedInvoiceId: string | null;
        isReconciled: boolean;
    }[]>;
    private tryMatch;
}
