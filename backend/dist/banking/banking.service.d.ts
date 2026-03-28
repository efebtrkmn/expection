import { PrismaService } from '../prisma/prisma.service';
import { BankSyncService } from './bank-sync.service';
export declare class CreateBankAccountDto {
    bankName: string;
    accountNumber: string;
    iban: string;
    currency?: string;
    provider?: string;
    providerAccountId?: string;
}
export declare class BankingService {
    private readonly prisma;
    private readonly syncService;
    constructor(prisma: PrismaService, syncService: BankSyncService);
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
    getTransactions(bankAccountId: string, tenantId: string): Promise<{
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
    manualSync(bankAccountId: string, tenantId: string): Promise<{
        synced: number;
        total: number;
    }>;
}
