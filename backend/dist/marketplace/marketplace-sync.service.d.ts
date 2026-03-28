import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
export declare class MarketplaceSyncService {
    private readonly prisma;
    private readonly httpService;
    private readonly logger;
    constructor(prisma: PrismaService, httpService: HttpService);
    scheduledSync(): Promise<void>;
    syncConnection(conn: any): Promise<void>;
    private processOrder;
    private createDraftInvoiceForOrder;
    private buildAdapter;
    private decrypt;
}
