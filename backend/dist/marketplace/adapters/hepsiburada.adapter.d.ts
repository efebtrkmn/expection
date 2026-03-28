import { HttpService } from '@nestjs/axios';
import { IMarketplaceAdapter, MarketplaceOrder } from './marketplace-adapter.interface';
export declare class HepsiburadaAdapter implements IMarketplaceAdapter {
    private readonly httpService;
    private readonly merchantId;
    private readonly apiKey;
    private readonly logger;
    private readonly orderBaseUrl;
    constructor(httpService: HttpService, merchantId: string, apiKey: string);
    getOrders(since?: Date): Promise<MarketplaceOrder[]>;
    getOrderDetail(orderId: string): Promise<MarketplaceOrder>;
    private mapHepsiburadaOrder;
    private getMockOrders;
}
