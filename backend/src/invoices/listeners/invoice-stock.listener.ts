import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ProductsService } from '../../products/products.service';
import { InvoiceType } from '@prisma/client';

@Injectable()
export class InvoiceStockListener {
  private readonly logger = new Logger(InvoiceStockListener.name);

  constructor(private readonly productsService: ProductsService) {}

  /**
   * "invoice.posted" (Fatura Kesildi) Olayını Yakalar ve Stok Düşümünü Başlatır
   */
  @OnEvent('invoice.posted', { async: true })
  async handleStockUpdates(payload: { tenantId: string; invoice: any }) {
    const { tenantId, invoice } = payload;
    this.logger.log(`[EVENT] Stok Analizi tetiklendi - Fatura No: ${invoice.invoiceNumber}`);

    if (!invoice.items || invoice.items.length === 0) {
      return; // Kalemsiz fatura (Yok ama önlem)
    }

    try {
      // 1. Satış yapılmış veya Alımdan iade edilmişse Stok AZALIR
      if (invoice.type === InvoiceType.SALES || invoice.type === InvoiceType.RETURN_PURCHASE) {
        const reductionItems = invoice.items.map((item: any) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
        }));

        // ReduceStockLevels metodu aynı zamanda kritik stoğu dinleyen 
        // WebSocket'a ('stock.alert') alarm mesajını fırlatmaktan da sorumludur 
        await this.productsService.reduceStockLevels(tenantId, reductionItems);

        this.logger.log(`BAŞARILI: ${invoice.invoiceNumber} faturasındaki satış kalemlerinin stok düşümleri tamamlandı.`);
      } 
      // 2. Mal/Hizmet alınmış veya Satıştan iade edilmişse Stok ARTAR
      else if (invoice.type === InvoiceType.PURCHASE || invoice.type === InvoiceType.RETURN_SALES) {
        const additionItems = invoice.items.map((item: any) => ({
          productId: item.productId,
          // Miktarı negatif (-) göndererek matematiksel olarak Stok Miktarını (StockQuantity - (-x) = StockQuantity + x) şeklinde artıracağız.
          quantity: -Number(item.quantity), 
        }));

        await this.productsService.reduceStockLevels(tenantId, additionItems);

        this.logger.log(`BAŞARILI: ${invoice.invoiceNumber} faturasındaki alış kalemlerinin stok girişleri tamamlandı.`);
      }
    } catch (error) {
      this.logger.error(`KRİTİK HATA: Stoklar otomatik güncellenemedi: ${error.message} - FATURA: ${invoice.invoiceNumber}`);
    }
  }
}
