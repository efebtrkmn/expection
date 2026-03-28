import { HttpService } from '@nestjs/axios';
import { IMarketplaceAdapter, MarketplaceOrder } from './marketplace-adapter.interface';
export declare class TrendyolAdapter implements IMarketplaceAdapter {
    private readonly httpService;
    private readonly supplierId;
    private readonly apiKey;
    private readonly apiSecret;
    private readonly logger;
    private readonly baseUrl;
    constructor(httpService: HttpService, supplierId: string, apiKey: string, apiSecret: string);
    getOrders(since?: Date): Promise<MarketplaceOrder[]>;
    getOrderDetail(orderId: string): Promise<MarketplaceOrder>;
    private mapTrendyolOrder;
    private getMockOrders;
}
