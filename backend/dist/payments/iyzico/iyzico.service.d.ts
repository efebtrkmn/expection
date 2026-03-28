import { PrismaService } from '../../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
export declare class IyzicoService {
    private readonly prisma;
    private readonly httpService;
    private readonly config;
    private readonly logger;
    constructor(prisma: PrismaService, httpService: HttpService, config: ConfigService);
    private getSettings;
    onboardSubMerchant(tenantId: string): Promise<{
        success: boolean;
        subMerchantKey: any;
    }>;
    initializeCheckout(invoiceId: string, tenantId: string, contactId: string): Promise<{
        token: any;
        checkoutFormContent: any;
        tokenExpireTime: any;
        mock?: undefined;
    } | {
        token: string;
        checkoutFormContent: string;
        tokenExpireTime: number;
        mock: boolean;
    }>;
    private decrypt;
}
