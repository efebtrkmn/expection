import { BankingService, CreateBankAccountDto } from './banking.service';
import { ReconciliationService } from './reconciliation.service';
export declare class BankingController {
    private readonly bankingService;
    private readonly reconciliationService;
    constructor(bankingService: BankingService, reconciliationService: ReconciliationService);
    create(tenantId: string, dto: CreateBankAccountDto): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        isActive: boolean;
        currency: string;
        bankName: string;
        accountNumber: string;
        iban: string;
        provider: string;
        providerAccountId: string | null;
        lastSyncedAt: Date | null;
    }>;
    findAll(tenantId: string): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        isActive: boolean;
        currency: string;
        bankName: string;
        accountNumber: string;
        iban: string;
        provider: string;
        providerAccountId: string | null;
        lastSyncedAt: Date | null;
    }[]>;
    getTransactions(id: string, tenantId: string): Promise<{
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
    sync(id: string, tenantId: string): Promise<{
        synced: number;
        total: number;
    }>;
    getUnmatched(tenantId: string): Promise<{
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
    manualMatch(txId: string, invoiceId: string, tenantId: string): Promise<{
        matched: boolean;
        invoiceId: string;
        txId: string;
    }>;
}
