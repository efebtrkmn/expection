import { JournalService } from '../../journal/journal.service';
import { PrismaService } from '../../prisma/prisma.service';
export declare class InvoiceJournalListener {
    private readonly journalService;
    private readonly prisma;
    private readonly logger;
    private accountCache;
    constructor(journalService: JournalService, prisma: PrismaService);
    handleInvoicePostedEvent(payload: {
        tenantId: string;
        userId: string;
        invoice: any;
    }): Promise<void>;
    private getAccountId;
}
