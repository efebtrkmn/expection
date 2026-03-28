import { HttpService } from '@nestjs/axios';
import { IMarketplaceAdapter, MarketplaceOrder } from './marketplace-adapter.interface';
export declare class AmazonAdapter implements IMarketplaceAdapter {
    private readonly httpService;
    private readonly sellerId;
    private readonly lwaClientId;
    private readonly lwaClientSecret;
    private readonly lwaRefreshToken;
    private readonly logger;
    private readonly MARKETPLACE_ID;
    private readonly SP_API_BASE;
    private readonly LWA_URL;
    private cachedToken;
    private tokenExpiry;
    constructor(httpService: HttpService, sellerId: string, lwaClientId: string, lwaClientSecret: string, lwaRefreshToken: string);
    getOrders(since?: Date): Promise<MarketplaceOrder[]>;
    getOrderDetail(orderId: string): Promise<MarketplaceOrder>;
    private getOrderItems;
    private getLwaToken;
    private mapAmazonOrder;
    private getMockOrders;
    private delay;
}
