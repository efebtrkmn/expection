import { JournalReferenceType, JournalStatus } from '@prisma/client';
export declare class CreateLedgerLineDto {
    accountId: string;
    description?: string;
    debit: number;
    credit: number;
    currency?: string;
    exchangeRate?: number;
}
export declare class CreateJournalDto {
    entryNumber: string;
    entryDate: string | Date;
    description?: string;
    referenceType: JournalReferenceType;
    referenceId?: string;
    status?: JournalStatus;
    lines: CreateLedgerLineDto[];
}
