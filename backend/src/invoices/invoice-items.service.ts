import { Injectable } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { InvoiceItemDto } from './dto/create-invoice.dto';
import { ProductUnit } from '@prisma/client';

export interface CalculatedItem {
  description: string;
  productId?: string;
  quantity: number;
  unitPrice: number;
  unit: ProductUnit;
  discountRate: number;
  discountAmount: number;
  taxRate: number;
  withholdingRate: number;
  lineSubtotal: number;
  lineTax: number;
  lineWithholding: number;
  lineTotal: number;
}

export interface InvoiceTotals {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  withholdingTotal: number;
  totalAmount: number;
}

@Injectable()
export class InvoiceCalculatorService {
  /**
   * Finansal mükemmeliyet (ACID/Decimal precision) ile İskonto, KDV ve Tevkifatı hesaplar.
   * Mevzuat gereği Tevkifat (Withholding), çıkan KDV tutarı üzerinden (%) olarak hesaplanır
   * ve genel tahsilat (Toplam Tutar) yekününden düşülür.
   */
  calculateItems(items: InvoiceItemDto[]): { calculatedItems: CalculatedItem[], totals: InvoiceTotals } {
    let globalSubtotal = new Decimal(0);
    let globalDiscount = new Decimal(0);
    let globalTax = new Decimal(0);
    let globalWithholding = new Decimal(0);
    let globalTotal = new Decimal(0);

    const calculatedItems = items.map(item => {
      // 1. Baz metrikler (Raw values)
      const qty = new Decimal(item.quantity);
      const price = new Decimal(item.unitPrice);
      
      // 2. Brüt Tutar
      const rawSubtotal = qty.times(price);
      
      // 3. İskonto Hesaplama
      const discountRate = new Decimal(item.discountRate || 0).dividedBy(100);
      const discountAmt = rawSubtotal.times(discountRate);
      
      // 4. Net (İskonto düşülmüş KDV Hariç) Tutar
      const netSubtotal = rawSubtotal.minus(discountAmt);
      
      // 5. KDV Hesaplama
      const taxRate = new Decimal(item.taxRate || 20).dividedBy(100);
      const taxAmt = netSubtotal.times(taxRate);
      
      // 6. KDV Tevkifatı (Tevkifat Matrahı KDV'DİR)
      const withRate = new Decimal(item.withholdingRate || 0).dividedBy(100);
      const withholdingAmt = taxAmt.times(withRate);

      // 7. Müşteriden fiilen tahsil edilecek Net KDV
      const netTax = taxAmt.minus(withholdingAmt);

      // 8. Satır Genel Toplamı (Net Tutar + Net KDV)
      const lineTotal = netSubtotal.plus(netTax);

      // Genel Toplamlara Ekleme (Yuvarlama hatalarını önlemek için Decimal üzerinden)
      globalSubtotal = globalSubtotal.plus(netSubtotal);
      globalDiscount = globalDiscount.plus(discountAmt);
      globalTax = globalTax.plus(taxAmt);
      globalWithholding = globalWithholding.plus(withholdingAmt);
      globalTotal = globalTotal.plus(lineTotal);

      // DB'ye yazılacak ham çıktıyı (Number/Float) virgülden sonra 2 hane ile temizle (Yuvarla)
      return {
        description: item.description,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unit: item.unit,
        discountRate: item.discountRate || 0,
        discountAmount: discountAmt.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
        taxRate: item.taxRate || 20,
        withholdingRate: item.withholdingRate || 0,
        lineSubtotal: netSubtotal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
        lineTax: taxAmt.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
        lineWithholding: withholdingAmt.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
        lineTotal: lineTotal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
      };
    });

    return {
      calculatedItems,
      totals: {
        subtotal: globalSubtotal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
        discountAmount: globalDiscount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
        taxAmount: globalTax.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
        withholdingTotal: globalWithholding.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
        totalAmount: globalTotal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
      }
    };
  }
}
