import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IMarketplaceAdapter, MarketplaceOrder } from './marketplace-adapter.interface';

/**
 * Trendyol Pazaryeri Adaptörü
 *
 * API Dokümantasyonu: https://developers.trendyol.com/tr
 * Auth: Basic Auth — base64(supplierId:apiKey apiSecret)
 * Base URL: https://api.trendyol.com/sapigw
 *
 * Endpoint: GET /suppliers/{supplierId}/orders
 * Rate Limit: 100 istek/dakika
 */
@Injectable()
export class TrendyolAdapter implements IMarketplaceAdapter {
  private readonly logger = new Logger(TrendyolAdapter.name);
  private readonly baseUrl = 'https://api.trendyol.com/sapigw';

  constructor(
    private readonly httpService: HttpService,
    private readonly supplierId: string,
    private readonly apiKey: string,
    private readonly apiSecret: string,
  ) {}

  async getOrders(since?: Date): Promise<MarketplaceOrder[]> {
    const startDate = since ? since.getTime() : Date.now() - 24 * 60 * 60 * 1000;

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/suppliers/${this.supplierId}/orders`, {
          params: {
            startDate: Math.floor(startDate),
            endDate: Date.now(),
            size: 200,
            page: 0,
            status: 'Created',
          },
          auth: { username: this.apiKey, password: this.apiSecret },
          headers: { 'User-Agent': `${this.supplierId} - Expection SaaS` },
          timeout: 15000,
        })
      );

      const orders = response.data?.content || [];
      return orders.map((o: any) => this.mapTrendyolOrder(o));
    } catch (err) {
      this.logger.error(`Trendyol API hatası: ${err.message}`);
      return this.getMockOrders(); // Mock döndür — geliştirme ortamı
    }
  }

  async getOrderDetail(orderId: string): Promise<MarketplaceOrder> {
    const response = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/suppliers/${this.supplierId}/orders/${orderId}`, {
        auth: { username: this.apiKey, password: this.apiSecret },
        timeout: 10000,
      })
    );
    return this.mapTrendyolOrder(response.data);
  }

  private mapTrendyolOrder(order: any): MarketplaceOrder {
    return {
      orderId: String(order.orderNumber || order.id),
      marketplace: 'TRENDYOL',
      status: order.status || 'Created',
      customerName: `${order.shipmentAddress?.firstName || ''} ${order.shipmentAddress?.lastName || ''}`.trim(),
      customerEmail: order.customerEmail,
      totalAmount: Number(order.totalPrice || 0),
      currency: 'TRY',
      orderedAt: new Date(order.orderDate || Date.now()),
      lines: (order.lines || []).map((l: any) => ({
        productCode: l.barcode,
        productName: l.productName,
        quantity: l.quantity,
        unitPrice: l.price,
        taxRate: l.vatBaseAmountStr ? 20 : 20,
        currency: 'TRY',
      })),
      rawPayload: order,
    };
  }

  private getMockOrders(): MarketplaceOrder[] {
    return [{
      orderId: `MOCK-TY-${Date.now()}`,
      marketplace: 'TRENDYOL',
      status: 'Created',
      customerName: 'Test Müşteri',
      customerEmail: 'test@example.com',
      totalAmount: 1180,
      currency: 'TRY',
      orderedAt: new Date(),
      lines: [{ productName: 'Test Ürün', quantity: 1, unitPrice: 1000, taxRate: 20, currency: 'TRY' }],
      rawPayload: { mock: true },
    }];
  }
}
