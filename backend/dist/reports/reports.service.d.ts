import { PrismaService } from '../prisma/prisma.service';
export declare class ReportsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getDashboardSummary(tenantId: string, periodStart: Date, periodEnd: Date): Promise<{
        period: {
            start: Date;
            end: Date;
        };
        financials: {
            totalRevenue: number;
            totalCogs: number;
            grossProfit: number;
        };
        invoiceStats: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.InvoiceGroupByOutputType, ("status" | "type")[]> & {
            _count: number;
        })[];
    }>;
    getProfitAndLoss(tenantId: string, year: number): Promise<unknown>;
    getTrialBalance(tenantId: string, asOfDate: Date): Promise<unknown>;
}
