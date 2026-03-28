import { Injectable, Logger } from '@nestjs/common';
import { create } from 'xmlbuilder2';
import { v4 as uuidv4 } from 'uuid';
import { InvoiceType } from '@prisma/client';

/**
 * GİB UBL-TR 2.1 XML Oluşturma Motoru
 *
 * Teknik Referans: GİB UBL-TR Teknik Kılavuzu v1.2
 * https://www.gib.gov.tr/sites/default/files/fileadmin/efatura/
 *
 * Desteklenen Tipler:
 *   - TICARIFATURA  → B2B e-Fatura
 *   - EARSIVFATURA  → B2C e-Arşiv Fatura
 */
@Injectable()
export class UblBuilderService {
  private readonly logger = new Logger(UblBuilderService.name);

  // GİB UBL-TR Zorunlu Namespace Tanımları
  private readonly NAMESPACES = {
    'xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
    'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
    'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
    'xmlns:ext': 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
  };

  /**
   * Fatura ve Tenant bilgisinden GİB uyumlu UBL-TR XML üretir.
   * @param invoice Prisma Invoice (items, customerSupplier dahil)
   * @param tenant  Prisma Tenant (satıcı bilgileri)
   * @returns UBL-TR XML string
   */
  buildXml(invoice: any, tenant: any): string {
    this.logger.log(`UBL-TR XML üretiliyor: ${invoice.invoiceNumber}`);

    const profileId = invoice.type === InvoiceType.SALES ? 'TICARIFATURA' : 'EARSIVFATURA';
    const invoiceTypeCode = this.getInvoiceTypeCode(invoice.type);
    const docUuid = invoice.eInvoiceUuid || uuidv4();

    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('Invoice', this.NAMESPACES);

    // ─── 1. UBL Versiyon ve Profil Bilgileri ──────────────────────────────────
    root.ele('ext:UBLExtensions').ele('ext:UBLExtension').ele('ext:ExtensionContent').up().up().up();
    root.ele('cbc:UBLVersionID').txt('2.1');
    root.ele('cbc:CustomizationID').txt('TR1.2');
    root.ele('cbc:ProfileID').txt(profileId);
    root.ele('cbc:ID').txt(invoice.invoiceNumber);
    root.ele('cbc:CopyIndicator').txt('false');
    root.ele('cbc:UUID').txt(docUuid);
    root.ele('cbc:IssueDate').txt(this.formatDate(invoice.issueDate));
    root.ele('cbc:IssueTime').txt('09:00:00');
    root.ele('cbc:InvoiceTypeCode').txt(invoiceTypeCode);
    root.ele('cbc:DocumentCurrencyCode').txt(invoice.currency || 'TRY');
    root.ele('cbc:LineCountNumeric').txt(String(invoice.items?.length || 0));

    // ─── 2. Satıcı (AccountingSupplierParty) → Tenant ─────────────────────────
    const supplier = root.ele('cac:AccountingSupplierParty').ele('cac:Party');
    supplier.ele('cac:PartyIdentification')
      .ele('cbc:ID', { schemeID: 'VKN' }).txt(tenant.taxNumber || '0000000000');
    supplier.ele('cac:PartyName').ele('cbc:Name').txt(tenant.name);
    supplier.ele('cac:PostalAddress')
      .ele('cbc:CityName').txt(tenant.city || 'İstanbul').up()
      .ele('cac:Country').ele('cbc:Name').txt('Türkiye');
    supplier.ele('cac:PartyTaxScheme')
      .ele('cbc:Name').txt(tenant.taxOffice || 'Bağcılar').up()
      .ele('cac:TaxScheme').ele('cbc:Name').txt('VKN');
    supplier.ele('cac:Contact').ele('cbc:ElectronicMail').txt(tenant.email || '');

    // ─── 3. Alıcı (AccountingCustomerParty) → CustomerSupplier ───────────────
    const customer = root.ele('cac:AccountingCustomerParty').ele('cac:Party');
    const cs = invoice.customerSupplier;
    if (cs?.taxNumber) {
      customer.ele('cac:PartyIdentification')
        .ele('cbc:ID', { schemeID: 'VKN' }).txt(cs.taxNumber);
    }
    customer.ele('cac:PartyName').ele('cbc:Name').txt(cs?.name || 'Belirtilmemiş');
    customer.ele('cac:PostalAddress')
      .ele('cbc:CityName').txt(cs?.city || 'İstanbul').up()
      .ele('cac:Country').ele('cbc:Name').txt('Türkiye');

    // ─── 4. Ödeme Koşulları ────────────────────────────────────────────────────
    if (invoice.dueDate) {
      root.ele('cac:PaymentTerms')
        .ele('cbc:Note').txt('Vade Tarihi').up()
        .ele('cbc:PaymentDueDate').txt(this.formatDate(invoice.dueDate));
    }

    // ─── 5. KDV Toplamı (TaxTotal) ────────────────────────────────────────────
    const taxTotal = root.ele('cac:TaxTotal');
    taxTotal.ele('cbc:TaxAmount', { currencyID: invoice.currency || 'TRY' })
      .txt(this.formatDecimal(invoice.taxAmount));

    // KDV oranı bazında gruplama (fatura kalemlerinden toplanan benzersiz oranlar)
    const taxRateGroups = this.groupByTaxRate(invoice.items || []);
    for (const group of taxRateGroups) {
      const subtotal = taxTotal.ele('cac:TaxSubtotal');
      subtotal.ele('cbc:TaxableAmount', { currencyID: invoice.currency || 'TRY' })
        .txt(this.formatDecimal(group.taxableAmount));
      subtotal.ele('cbc:TaxAmount', { currencyID: invoice.currency || 'TRY' })
        .txt(this.formatDecimal(group.taxAmount));
      subtotal.ele('cac:TaxCategory')
        .ele('cbc:Percent').txt(String(group.rate)).up()
        .ele('cac:TaxScheme').ele('cbc:Name').txt('KDV');
    }

    // ─── 6. Para Toplamları (LegalMonetaryTotal) ──────────────────────────────
    const monetary = root.ele('cac:LegalMonetaryTotal');
    monetary.ele('cbc:LineExtensionAmount', { currencyID: invoice.currency || 'TRY' })
      .txt(this.formatDecimal(invoice.subtotal));
    monetary.ele('cbc:TaxExclusiveAmount', { currencyID: invoice.currency || 'TRY' })
      .txt(this.formatDecimal(invoice.subtotal));
    monetary.ele('cbc:TaxInclusiveAmount', { currencyID: invoice.currency || 'TRY' })
      .txt(this.formatDecimal(invoice.totalAmount));
    monetary.ele('cbc:AllowanceTotalAmount', { currencyID: invoice.currency || 'TRY' })
      .txt(this.formatDecimal(invoice.discountAmount || 0));
    monetary.ele('cbc:PayableAmount', { currencyID: invoice.currency || 'TRY' })
      .txt(this.formatDecimal(invoice.totalAmount));

    // ─── 7. Fatura Kalemleri (InvoiceLine) ───────────────────────────────────
    const items = invoice.items || [];
    items.forEach((item: any, idx: number) => {
      const line = root.ele('cac:InvoiceLine');
      line.ele('cbc:ID').txt(String(idx + 1));
      line.ele('cbc:InvoicedQuantity', { unitCode: this.mapUnit(item.unit) })
        .txt(this.formatDecimal(item.quantity));
      line.ele('cbc:LineExtensionAmount', { currencyID: invoice.currency || 'TRY' })
        .txt(this.formatDecimal(item.lineSubtotal));

      // Kalem KDV
      const lineTax = line.ele('cac:TaxTotal');
      lineTax.ele('cbc:TaxAmount', { currencyID: invoice.currency || 'TRY' })
        .txt(this.formatDecimal(item.lineTax));
      lineTax.ele('cac:TaxSubtotal')
        .ele('cbc:TaxableAmount', { currencyID: invoice.currency || 'TRY' }).txt(this.formatDecimal(item.lineSubtotal)).up()
        .ele('cbc:TaxAmount', { currencyID: invoice.currency || 'TRY' }).txt(this.formatDecimal(item.lineTax)).up()
        .ele('cac:TaxCategory')
        .ele('cbc:Percent').txt(String(item.taxRate || 20)).up()
        .ele('cac:TaxScheme').ele('cbc:Name').txt('KDV');

      // Ürün Bilgisi
      line.ele('cac:Item')
        .ele('cbc:Description').txt(item.description || '').up()
        .ele('cbc:Name').txt(item.product?.name || item.description || '');

      // Birim Fiyat
      line.ele('cac:Price')
        .ele('cbc:PriceAmount', { currencyID: invoice.currency || 'TRY' })
        .txt(this.formatDecimal(item.unitPrice));
    });

    const xml = root.end({ prettyPrint: true });
    this.logger.log(`UBL-TR XML başarıyla üretildi: ${invoice.invoiceNumber} (${xml.length} byte)`);
    return xml;
  }

  // ─── Yardımcı Metodlar ────────────────────────────────────────────────────

  private getInvoiceTypeCode(type: InvoiceType): string {
    switch (type) {
      case InvoiceType.SALES:        return 'SATIS';
      case InvoiceType.RETURN_SALES: return 'IADE';
      case InvoiceType.PURCHASE:     return 'ALIS';
      default:                       return 'SATIS';
    }
  }

  private formatDate(date: Date | string): string {
    return new Date(date).toISOString().split('T')[0];
  }

  private formatDecimal(value: any): string {
    return Number(value || 0).toFixed(2);
  }

  /** ADET → UN/ECE Birim kodlarına dönüştürme */
  private mapUnit(unit: string): string {
    const map: Record<string, string> = {
      ADET: 'C62', KG: 'KGM', METRE: 'MTR',
      LITRE: 'LTR', SAAT: 'HUR', KUTU: 'CT',
      PAKET: 'PK', GUMRUK: 'SET',
    };
    return map[unit] || 'C62';
  }

  private groupByTaxRate(items: any[]): Array<{ rate: number; taxableAmount: number; taxAmount: number }> {
    const groups = new Map<number, { taxableAmount: number; taxAmount: number }>();
    for (const item of items) {
      const rate = item.taxRate || 20;
      const existing = groups.get(rate) || { taxableAmount: 0, taxAmount: 0 };
      groups.set(rate, {
        taxableAmount: existing.taxableAmount + Number(item.lineSubtotal || 0),
        taxAmount: existing.taxAmount + Number(item.lineTax || 0),
      });
    }
    return Array.from(groups.entries()).map(([rate, data]) => ({ rate, ...data }));
  }
}
