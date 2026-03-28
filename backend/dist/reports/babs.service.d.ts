import { PrismaService } from '../prisma/prisma.service';
export declare class BabsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getBaList(tenantId: string, period: string): Promise<unknown>;
    getBsList(tenantId: string, period: string): Promise<unknown>;
}
