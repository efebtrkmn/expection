import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Mt940ParserService } from './mt940-parser.service';
export declare class BankSyncService {
    private readonly prisma;
    private readonly httpService;
    private readonly config;
    private readonly mt940Parser;
    private readonly logger;
    private readonly kolayBiBaseUrl;
    private readonly kolayBiToken;
    private readonly isMock;
    constructor(prisma: PrismaService, httpService: HttpService, config: ConfigService, mt940Parser: Mt940ParserService);
    scheduledSync(): Promise<void>;
    syncAccount(bankAccountId: string, tenantId: string, providerAccountId?: string | null): Promise<{
        synced: number;
        total: number;
    }>;
    private fetchFromKolayBi;
    private getMockMt940;
}
