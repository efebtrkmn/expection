/**
 * Pazaryeri Adaptörü Arayüzü (DIP — Dependency Inversion Principle)
 *
 * Tüm pazaryeri adaptörleri bu interface'i uygulamak zorundadır.
 * MarketplaceSyncService bu interface üzerinden çalışır, spesifik
 * adaptörlerden habersizdir (Loose Coupling).
 */
export interface MarketplaceOrder {
  orderId: string;
  marketplace: string;
  status: string;
  customerName?: string;
  customerEmail?: string;
  totalAmount: number;
  currency: string;
  orderedAt: Date;
  lines: MarketplaceOrderLine[];
  rawPayload: any;
}

export interface MarketplaceOrderLine {
  productCode?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  currency: string;
}

export interface IMarketplaceAdapter {
  getOrders(since?: Date): Promise<MarketplaceOrder[]>;
  getOrderDetail(orderId: string): Promise<MarketplaceOrder>;
}
