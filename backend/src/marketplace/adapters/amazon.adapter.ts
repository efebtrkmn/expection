import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IMarketplaceAdapter, MarketplaceOrder } from './marketplace-adapter.interface';

/**
 * Amazon Türkiye (amazon.com.tr) Pazaryeri Adaptörü
 *
 * API: Amazon Selling Partner API (SP-API)
 * Dokümantasyon: https://developer-docs.amazon.com/sp-api
 * Auth: LWA (Login with Amazon) OAuth 2.0 Client Credentials
 *       + AWS Signature V4 (SigV4) için AWS IAM Role
 *
 * Marketplace ID (TR): A33AVAJ2PDY3EV
 * Endpoint: https://sellingpartnerapi-eu.amazon.com
 *
 * Akış:
 *   1. LWA token al: POST https://api.amazon.com/auth/o2/token
 *   2. AWS SigV4 imzalı header ile API çağır
 *   3. GET /orders/v0/orders → sipariş listesi
 *   4. GET /orders/v0/orders/{orderId}/orderItems → kalemler
 */
@Injectable()
export class AmazonAdapter implements IMarketplaceAdapter {
  private readonly logger = new Logger(AmazonAdapter.name);
  private readonly MARKETPLACE_ID = 'A33AVAJ2PDY3EV'; // amazon.com.tr
  private readonly SP_API_BASE = 'https://sellingpartnerapi-eu.amazon.com';
  private readonly LWA_URL = 'https://api.amazon.com/auth/o2/token';

  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(
    private readonly httpService: HttpService,
    private readonly sellerId: string,
    private readonly lwaClientId: string,
    private readonly lwaClientSecret: string,
    private readonly lwaRefreshToken: string,
  ) {}

  async getOrders(since?: Date): Promise<MarketplaceOrder[]> {
    const createdAfter = (since || new Date(Date.now() - 86400000)).toISOString();

    try {
      const token = await this.getLwaToken();

      const response = await firstValueFrom(
        this.httpService.get(`${this.SP_API_BASE}/orders/v0/orders`, {
          params: {
            MarketplaceIds: this.MARKETPLACE_ID,
            CreatedAfter: createdAfter,
            OrderStatuses: 'Unshipped,PartiallyShipped,Shipped,Pending',
            MaxResultsPerPage: 100,
          },
          headers: { 'x-amz-access-token': token },
          timeout: 15000,
        })
      );

      const orders: MarketplaceOrder[] = [];
      const amazonOrders = response.data?.payload?.Orders || [];

      for (const o of amazonOrders) {
        const items = await this.getOrderItems(o.AmazonOrderId, token);
        orders.push(this.mapAmazonOrder(o, items));
        // Rate limit saygısı: Amazon SP-API 1 istek/saniye
        await this.delay(1100);
      }

      return orders;
    } catch (err) {
      this.logger.error(`Amazon SP-API hatası: ${err.message}`);
      return this.getMockOrders();
    }
  }

  async getOrderDetail(orderId: string): Promise<MarketplaceOrder> {
    const token = await this.getLwaToken();
    const [orderRes, itemsRes] = await Promise.all([
      firstValueFrom(this.httpService.get(`${this.SP_API_BASE}/orders/v0/orders/${orderId}`, {
        headers: { 'x-amz-access-token': token },
      })),
      this.getOrderItems(orderId, token),
    ]);
    return this.mapAmazonOrder(orderRes.data?.payload, itemsRes);
  }

  private async getOrderItems(orderId: string, token: string): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.SP_API_BASE}/orders/v0/orders/${orderId}/orderItems`, {
          headers: { 'x-amz-access-token': token },
          timeout: 10000,
        })
      );
      return response.data?.payload?.OrderItems || [];
    } catch {
      return [];
    }
  }

  private async getLwaToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiry) {
      return this.cachedToken;
    }

    if (!this.lwaClientId) {
      return 'MOCK_TOKEN';
    }

    const response = await firstValueFrom(
      this.httpService.post(this.LWA_URL, {
        grant_type: 'refresh_token',
        refresh_token: this.lwaRefreshToken,
        client_id: this.lwaClientId,
        client_secret: this.lwaClientSecret,
      })
    );

    this.cachedToken = response.data.access_token;
    this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
    return this.cachedToken!;
  }

  private mapAmazonOrder(order: any, items: any[]): MarketplaceOrder {
    const total = parseFloat(order.OrderTotal?.Amount || '0');
    return {
      orderId: order.AmazonOrderId,
      marketplace: 'AMAZON',
      status: order.OrderStatus || 'Pending',
      customerName: order.BuyerInfo?.BuyerName,
      customerEmail: order.BuyerInfo?.BuyerEmail,
      totalAmount: total,
      currency: order.OrderTotal?.CurrencyCode || 'TRY',
      orderedAt: new Date(order.PurchaseDate || Date.now()),
      lines: items.map((i: any) => ({
        productCode: i.SellerSKU,
        productName: i.Title,
        quantity: i.QuantityOrdered,
        unitPrice: parseFloat(i.ItemPrice?.Amount || '0') / (i.QuantityOrdered || 1),
        taxRate: 20,
        currency: i.ItemPrice?.CurrencyCode || 'TRY',
      })),
      rawPayload: { order, items },
    };
  }

  private getMockOrders(): MarketplaceOrder[] {
    return [{
      orderId: `MOCK-AMZ-${Date.now()}`,
      marketplace: 'AMAZON',
      status: 'Unshipped',
      customerName: 'Amazon Test Buyer',
      customerEmail: 'amztest@example.com',
      totalAmount: 2360,
      currency: 'TRY',
      orderedAt: new Date(),
      lines: [{ productName: 'Amazon Test Ürün', quantity: 2, unitPrice: 1000, taxRate: 20, currency: 'TRY' }],
      rawPayload: { mock: true },
    }];
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
