"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var UblBuilderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UblBuilderService = void 0;
const common_1 = require("@nestjs/common");
const xmlbuilder2_1 = require("xmlbuilder2");
const uuid_1 = require("uuid");
const client_1 = require("@prisma/client");
let UblBuilderService = UblBuilderService_1 = class UblBuilderService {
    constructor() {
        this.logger = new common_1.Logger(UblBuilderService_1.name);
        this.NAMESPACES = {
            'xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
            'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
            'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
            'xmlns:ext': 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
            'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        };
    }
    buildXml(invoice, tenant) {
        this.logger.log(`UBL-TR XML üretiliyor: ${invoice.invoiceNumber}`);
        const profileId = invoice.type === client_1.InvoiceType.SALES ? 'TICARIFATURA' : 'EARSIVFATURA';
        const invoiceTypeCode = this.getInvoiceTypeCode(invoice.type);
        const docUuid = invoice.eInvoiceUuid || (0, uuid_1.v4)();
        const root = (0, xmlbuilder2_1.create)({ version: '1.0', encoding: 'UTF-8' })
            .ele('Invoice', this.NAMESPACES);
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
        if (invoice.dueDate) {
            root.ele('cac:PaymentTerms')
                .ele('cbc:Note').txt('Vade Tarihi').up()
                .ele('cbc:PaymentDueDate').txt(this.formatDate(invoice.dueDate));
        }
        const taxTotal = root.ele('cac:TaxTotal');
        taxTotal.ele('cbc:TaxAmount', { currencyID: invoice.currency || 'TRY' })
            .txt(this.formatDecimal(invoice.taxAmount));
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
        const items = invoice.items || [];
        items.forEach((item, idx) => {
            const line = root.ele('cac:InvoiceLine');
            line.ele('cbc:ID').txt(String(idx + 1));
            line.ele('cbc:InvoicedQuantity', { unitCode: this.mapUnit(item.unit) })
                .txt(this.formatDecimal(item.quantity));
            line.ele('cbc:LineExtensionAmount', { currencyID: invoice.currency || 'TRY' })
                .txt(this.formatDecimal(item.lineSubtotal));
            const lineTax = line.ele('cac:TaxTotal');
            lineTax.ele('cbc:TaxAmount', { currencyID: invoice.currency || 'TRY' })
                .txt(this.formatDecimal(item.lineTax));
            lineTax.ele('cac:TaxSubtotal')
                .ele('cbc:TaxableAmount', { currencyID: invoice.currency || 'TRY' }).txt(this.formatDecimal(item.lineSubtotal)).up()
                .ele('cbc:TaxAmount', { currencyID: invoice.currency || 'TRY' }).txt(this.formatDecimal(item.lineTax)).up()
                .ele('cac:TaxCategory')
                .ele('cbc:Percent').txt(String(item.taxRate || 20)).up()
                .ele('cac:TaxScheme').ele('cbc:Name').txt('KDV');
            line.ele('cac:Item')
                .ele('cbc:Description').txt(item.description || '').up()
                .ele('cbc:Name').txt(item.product?.name || item.description || '');
            line.ele('cac:Price')
                .ele('cbc:PriceAmount', { currencyID: invoice.currency || 'TRY' })
                .txt(this.formatDecimal(item.unitPrice));
        });
        const xml = root.end({ prettyPrint: true });
        this.logger.log(`UBL-TR XML başarıyla üretildi: ${invoice.invoiceNumber} (${xml.length} byte)`);
        return xml;
    }
    getInvoiceTypeCode(type) {
        switch (type) {
            case client_1.InvoiceType.SALES: return 'SATIS';
            case client_1.InvoiceType.RETURN_SALES: return 'IADE';
            case client_1.InvoiceType.PURCHASE: return 'ALIS';
            default: return 'SATIS';
        }
    }
    formatDate(date) {
        return new Date(date).toISOString().split('T')[0];
    }
    formatDecimal(value) {
        return Number(value || 0).toFixed(2);
    }
    mapUnit(unit) {
        const map = {
            ADET: 'C62', KG: 'KGM', METRE: 'MTR',
            LITRE: 'LTR', SAAT: 'HUR', KUTU: 'CT',
            PAKET: 'PK', GUMRUK: 'SET',
        };
        return map[unit] || 'C62';
    }
    groupByTaxRate(items) {
        const groups = new Map();
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
};
exports.UblBuilderService = UblBuilderService;
exports.UblBuilderService = UblBuilderService = UblBuilderService_1 = __decorate([
    (0, common_1.Injectable)()
], UblBuilderService);
//# sourceMappingURL=ubl-builder.service.js.map