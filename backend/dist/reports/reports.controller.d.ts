import { ReportsService } from './reports.service';
import { BabsService } from './babs.service';
export declare class ReportsController {
    private readonly reportsService;
    private readonly babsService;
    constructor(reportsService: ReportsService, babsService: BabsService);
    getDashboard(tenantId: string, start?: string, end?: string): Promise<{
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
    getTrialBalance(tenantId: string, date?: string): Promise<unknown>;
    getBabsForms(tenantId: string, period: string): Promise<{
        period: string;
        baFormInfo: {
            totalListed: number;
            data: unknown;
        };
        bsFormInfo: {
            totalListed: number;
            data: unknown;
        };
    }>;
}
