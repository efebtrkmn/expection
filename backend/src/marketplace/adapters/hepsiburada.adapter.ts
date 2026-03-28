import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IMarketplaceAdapter, MarketplaceOrder } from './marketplace-adapter.interface';

/**
 * Hepsiburada Pazaryeri Adaptörü
 *
 * API Dokümantasyonu: https://developers.hepsiburada.com
 * Auth: Basic Auth (username: merchantId, password: apiKey)
 * Base URL: https://listing-external.hepsiburada.com
 * Orders: https://mpop.hepsiburada.com/order/api/orders/merchantid/{merchantId}
 *
 * Rate Limit: 120 istek/dakika
 */
@Injectable()
export class HepsiburadaAdapter implements IMarketplaceAdapter {
  private readonly logger = new Logger(HepsiburadaAdapter.name);
  private readonly orderBaseUrl = 'https://mpop.hepsiburada.com/order/api';

  constructor(
    private readonly httpService: HttpService,
    private readonly merchantId: string,
    private readonly apiKey: string,
  ) {}

  async getOrders(since?: Date): Promise<MarketplaceOrder[]> {
    const beginDate = since
      ? since.toISOString().split('T')[0]
      : new Date(Date.now() - 86400000).toISOString().split('T')[0];

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.orderBaseUrl}/orders/merchantid/${this.merchantId}`,
          {
            params: { beginDate, offset: 0, limit: 200 },
            auth: { username: this.merchantId, password: this.apiKey },
            timeout: 15000,
          }
        )
      );

      const orders = response.data?.items || response.data || [];
      return orders.map((o: any) => this.mapHepsiburadaOrder(o));
    } catch (err) {
      this.logger.error(`Hepsiburada API hatası: ${err.message}`);
      return this.getMockOrders();
    }
  }

  async getOrderDetail(orderId: string): Promise<MarketplaceOrder> {
    const response = await firstValueFrom(
      this.httpService.get(
        `${this.orderBaseUrl}/orders/${orderId}/merchantid/${this.merchantId}`,
        { auth: { username: this.merchantId, password: this.apiKey }, timeout: 10000 }
      )
    );
    return this.mapHepsiburadaOrder(response.data);
  }

  private mapHepsiburadaOrder(order: any): MarketplaceOrder {
    return {
      orderId: String(order.orderNumber || order.id),
      marketplace: 'HEPSIBURADA',
      status: order.status || 'WAITING_IN_PACKAGE',
      customerName: order.customerName || order.customer?.fullName,
      customerEmail: order.customerEmail,
      totalAmount: Number(order.totalPrice || order.total || 0),
      currency: 'TRY',
      orderedAt: new Date(order.orderDate || order.createdDate || Date.now()),
      lines: (order.lineItems || order.lines || []).map((l: any) => ({
        productCode: l.sku || l.productSku,
        productName: l.productName,
        quantity: l.quantity || 1,
        unitPrice: l.unitPrice || l.price,
        taxRate: 20,
        currency: 'TRY',
      })),
      rawPayload: order,
    };
  }

  private getMockOrders(): MarketplaceOrder[] {
    return [{
      orderId: `MOCK-HB-${Date.now()}`,
      marketplace: 'HEPSIBURADA',
      status: 'WAITING_IN_PACKAGE',
      customerName: 'Hepsi Test Müşteri',
      customerEmail: 'hbtest@example.com',
      totalAmount: 599,
      currency: 'TRY',
      orderedAt: new Date(),
      lines: [{ productName: 'Hepsi Test Ürün', quantity: 1, unitPrice: 499.17, taxRate: 20, currency: 'TRY' }],
      rawPayload: { mock: true },
    }];
  }
}
