import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { TrendyolAdapter } from './adapters/trendyol.adapter';
import { HepsiburadaAdapter } from './adapters/hepsiburada.adapter';
import { AmazonAdapter } from './adapters/amazon.adapter';
import { IMarketplaceAdapter, MarketplaceOrder } from './adapters/marketplace-adapter.interface';
import { InvoiceStatus, InvoiceType, CustomerSupplierType, ProductUnit } from '@prisma/client';
import * as crypto from 'crypto';

/**
 * Pazaryeri Senkronizasyon Cron Job Servisi
 *
 * Akış:
 * 1. Tüm aktif marketplace bağlantılarını al
 * 2. Her bağlantı için doğru adaptörü instantiate et
 * 3. Yeni siparişleri adaptor üzerinden çek
 * 4. Her siparişi database'e UPSERT yap
 * 5. Henüz faturası olmayan siparişler için DRAFT fatura oluştur
 * 6. Bağlantının next_sync zamanını güncelle
 */
@Injectable()
export class MarketplaceSyncService {
  private readonly logger = new Logger(MarketplaceSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  /** Marketplace senkronizasyonu her 2 saatte bir çalışır */
  @Cron('0 */2 * * *', { name: 'marketplace_sync_job', timeZone: 'Europe/Istanbul' })
  async scheduledSync() {
    this.logger.log('[CRON] Pazaryeri senkronizasyonu başlatılıyor...');

    const connections = await this.prisma.marketplaceConnection.findMany({
      where: { isActive: true },
    });

    for (const conn of connections) {
      try {
        await this.syncConnection(conn);
      } catch (err) {
        this.logger.error(`[${conn.marketplace}] Sync hatası: ${err.message}`);
      }
    }
  }

  /** Tek bir bağlantı için manuel sync tetikleyicisi */
  async syncConnection(conn: any) {
    const adapter = this.buildAdapter(conn);
    const since = conn.lastSyncedAt ? new Date(conn.lastSyncedAt) : undefined;
    const orders = await adapter.getOrders(since);

    this.logger.log(`[${conn.marketplace}] ${orders.length} sipariş alındı`);

    for (const order of orders) {
      await this.processOrder(order, conn);
    }

    await this.prisma.marketplaceConnection.update({
      where: { id: conn.id },
      data: { lastSyncedAt: new Date() },
    });
  }

  private async processOrder(order: MarketplaceOrder, conn: any) {
    // 1. Aynı sipariş zaten işlendiyse atla (UPSERT)
    const existing = await this.prisma.marketplaceOrder.findUnique({
      where: {
        tenantId_marketplace_orderId: {
          tenantId: conn.tenantId,
          marketplace: conn.marketplace,
          orderId: order.orderId,
        },
      },
    });

    let dbOrder: any;

    if (existing) {
      // Sadece status güncelle
      dbOrder = await this.prisma.marketplaceOrder.update({
        where: { id: existing.id },
        data: { status: order.status as any, updatedAt: new Date() },
      });
    } else {
      dbOrder = await this.prisma.marketplaceOrder.create({
        data: {
          tenantId: conn.tenantId,
          connectionId: conn.id,
          orderId: order.orderId,
          marketplace: conn.marketplace,
          status: order.status as any,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          totalAmount: order.totalAmount,
          currency: order.currency || 'TRY',
          orderedAt: order.orderedAt,
          rawPayload: order.rawPayload,
        },
      });
    }

    // 2. Henüz fatura bağlı değilse DRAFT fatura oluştur
    if (!dbOrder.invoiceId && order.status !== 'CANCELLED') {
      try {
        await this.createDraftInvoiceForOrder(order, dbOrder, conn);
      } catch (err) {
        this.logger.error(`Sipariş ${order.orderId} fatura oluşturma hatası: ${err.message}`);
      }
    }
  }

  private async createDraftInvoiceForOrder(order: MarketplaceOrder, dbOrder: any, conn: any) {
    const tenantId = conn.tenantId;

    // Müşteri kaydı bul veya oluştur (email veya ad ile)
    let customer = await this.prisma.customerSupplier.findFirst({
      where: {
        tenantId,
        email: order.customerEmail || undefined,
      },
    });

    if (!customer && order.customerName) {
      customer = await this.prisma.customerSupplier.create({
        data: {
          tenantId,
          name: order.customerName,
          email: order.customerEmail,
          type: CustomerSupplierType.CUSTOMER,
          country: 'TR',
        },
      });
    }

    if (!customer) {
      this.logger.warn(`Sipariş ${order.orderId}: Müşteri oluşturulamadı, fatura atlanıyor`);
      return;
    }

    // Sistem kullanıcısı (SuperAdmin) al - fatura created_by için
    const systemUser = await this.prisma.user.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    if (!systemUser) {
      this.logger.warn(`Tenant ${tenantId}: Kullanıcı bulunamadı`);
      return;
    }

    // Fatura numarası: MP-[MARKET]-[ORDERID kısa]
    const shortOrderId = order.orderId.slice(-8).toUpperCase();
    const invoiceNumber = `MP-${conn.marketplace.substring(0, 2)}-${shortOrderId}`;

    // Toplam ve KDV hesapla (Pazaryeri fiyatları KDV dahil)
    const subtotal = order.lines.reduce((sum, l) => sum + (l.unitPrice * l.quantity), 0);
    const taxAmount = order.lines.reduce((sum, l) => {
      const net = (l.unitPrice * l.quantity) / (1 + l.taxRate / 100);
      return sum + ((l.unitPrice * l.quantity) - net);
    }, 0);

    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId,
        customerSupplierId: customer.id,
        invoiceNumber,
        type: InvoiceType.SALES,
        status: InvoiceStatus.DRAFT,
        issueDate: order.orderedAt,
        subtotal: Math.round((subtotal - taxAmount) * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        totalAmount: Math.round(subtotal * 100) / 100,
        currency: order.currency || 'TRY',
        notes: `${conn.marketplace} - Sipariş No: ${order.orderId}`,
        createdById: systemUser.id,
        items: {
          create: order.lines.map(l => ({
            tenantId,
            description: l.productName,
            quantity: l.quantity,
            unit: ProductUnit.ADET,
            unitPrice: l.unitPrice,
            taxRate: l.taxRate,
            lineSubtotal: Math.round((l.unitPrice * l.quantity) / (1 + l.taxRate / 100) * 100) / 100,
            lineTax: Math.round((l.unitPrice * l.quantity - (l.unitPrice * l.quantity) / (1 + l.taxRate / 100)) * 100) / 100,
            lineTotal: Math.round(l.unitPrice * l.quantity * 100) / 100,
          })),
        },
      },
    });

    // MarketplaceOrder'ı fatura ile ilişkilendir
    await this.prisma.marketplaceOrder.update({
      where: { id: dbOrder.id },
      data: { invoiceId: invoice.id },
    });

    this.logger.log(`Sipariş ${order.orderId} → DRAFT Fatura oluşturuldu: ${invoiceNumber}`);
  }

  private buildAdapter(conn: any): IMarketplaceAdapter {
    // API anahtarları env'den veya DB'den (şifreli) çözülür
    const apiKey = this.decrypt(conn.apiKeyEncrypted);
    const apiSecret = conn.apiSecretEncrypted ? this.decrypt(conn.apiSecretEncrypted) : '';
    const extra = conn.extraConfig || {};

    switch (conn.marketplace) {
      case 'TRENDYOL':
        return new TrendyolAdapter(this.httpService, conn.sellerId, apiKey, apiSecret);
      case 'HEPSIBURADA':
        return new HepsiburadaAdapter(this.httpService, conn.sellerId, apiKey);
      case 'AMAZON':
        return new AmazonAdapter(
          this.httpService,
          conn.sellerId,
          apiKey,
          apiSecret,
          extra.lwaRefreshToken || '',
        );
      default:
        throw new Error(`Desteklenmeyen pazaryeri: ${conn.marketplace}`);
    }
  }

  /** AES-256-CBC şifre çözme (API keys için) */
  private decrypt(encrypted: string): string {
    try {
      const encKey = process.env.APP_ENCRYPTION_KEY || 'default-32-char-key-for-dev-only!';
      const key = Buffer.from(encKey.padEnd(32).slice(0, 32));
      const [ivHex, encHex] = encrypted.split(':');
      if (!ivHex || !encHex) return encrypted; // Şifrelenmemişse olduğu gibi döndür
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
      return decipher.update(encHex, 'hex', 'utf-8') + decipher.final('utf-8');
    } catch {
      return encrypted; // Hata durumunda plaintext olarak dene
    }
  }
}
