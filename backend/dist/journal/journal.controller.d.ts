import { JournalService } from './journal.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { JournalStatus } from '@prisma/client';
export declare class JournalController {
    private readonly journalService;
    constructor(journalService: JournalService);
    create(tenantId: string, userId: string, dto: CreateJournalDto): Promise<{
        lines: {
            id: string;
            createdAt: Date;
            tenantId: string;
            currency: string;
            exchangeRate: import("@prisma/client/runtime/library").Decimal;
            journalEntryId: string;
            description: string | null;
            debit: import("@prisma/client/runtime/library").Decimal;
            credit: import("@prisma/client/runtime/library").Decimal;
            accountId: string;
        }[];
    } & {
        id: string;
        status: import(".prisma/client").$Enums.JournalStatus;
        createdAt: Date;
        tenantId: string;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        createdById: string;
        description: string | null;
        entryDate: Date;
        referenceId: string | null;
        referenceType: import(".prisma/client").$Enums.JournalReferenceType;
        entryNumber: string;
        postedAt: Date | null;
    }>;
    findAll(tenantId: string): Promise<({
        lines: ({
            account: {
                id: string;
                name: string;
                createdAt: Date;
                tenantId: string;
                isActive: boolean;
                type: import(".prisma/client").$Enums.AccountType;
                code: string;
                parentCode: string | null;
                normalBalance: import(".prisma/client").$Enums.NormalBalance;
                isSystem: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            tenantId: string;
            currency: string;
            exchangeRate: import("@prisma/client/runtime/library").Decimal;
            journalEntryId: string;
            description: string | null;
            debit: import("@prisma/client/runtime/library").Decimal;
            credit: import("@prisma/client/runtime/library").Decimal;
            accountId: string;
        })[];
    } & {
        id: string;
        status: import(".prisma/client").$Enums.JournalStatus;
        createdAt: Date;
        tenantId: string;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        createdById: string;
        description: string | null;
        entryDate: Date;
        referenceId: string | null;
        referenceType: import(".prisma/client").$Enums.JournalReferenceType;
        entryNumber: string;
        postedAt: Date | null;
    })[]>;
    findOne(id: string, tenantId: string): Promise<{
        lines: ({
            account: {
                id: string;
                name: string;
                createdAt: Date;
                tenantId: string;
                isActive: boolean;
                type: import(".prisma/client").$Enums.AccountType;
                code: string;
                parentCode: string | null;
                normalBalance: import(".prisma/client").$Enums.NormalBalance;
                isSystem: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            tenantId: string;
            currency: string;
            exchangeRate: import("@prisma/client/runtime/library").Decimal;
            journalEntryId: string;
            description: string | null;
            debit: import("@prisma/client/runtime/library").Decimal;
            credit: import("@prisma/client/runtime/library").Decimal;
            accountId: string;
        })[];
    } & {
        id: string;
        status: import(".prisma/client").$Enums.JournalStatus;
        createdAt: Date;
        tenantId: string;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        createdById: string;
        description: string | null;
        entryDate: Date;
        referenceId: string | null;
        referenceType: import(".prisma/client").$Enums.JournalReferenceType;
        entryNumber: string;
        postedAt: Date | null;
    }>;
    setStatus(id: string, status: JournalStatus, tenantId: string, userId: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.JournalStatus;
        createdAt: Date;
        tenantId: string;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        createdById: string;
        description: string | null;
        entryDate: Date;
        referenceId: string | null;
        referenceType: import(".prisma/client").$Enums.JournalReferenceType;
        entryNumber: string;
        postedAt: Date | null;
    }>;
}
