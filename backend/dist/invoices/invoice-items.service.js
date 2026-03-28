"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceCalculatorService = void 0;
const common_1 = require("@nestjs/common");
const decimal_js_1 = require("decimal.js");
let InvoiceCalculatorService = class InvoiceCalculatorService {
    calculateItems(items) {
        let globalSubtotal = new decimal_js_1.Decimal(0);
        let globalDiscount = new decimal_js_1.Decimal(0);
        let globalTax = new decimal_js_1.Decimal(0);
        let globalWithholding = new decimal_js_1.Decimal(0);
        let globalTotal = new decimal_js_1.Decimal(0);
        const calculatedItems = items.map(item => {
            const qty = new decimal_js_1.Decimal(item.quantity);
            const price = new decimal_js_1.Decimal(item.unitPrice);
            const rawSubtotal = qty.times(price);
            const discountRate = new decimal_js_1.Decimal(item.discountRate || 0).dividedBy(100);
            const discountAmt = rawSubtotal.times(discountRate);
            const netSubtotal = rawSubtotal.minus(discountAmt);
            const taxRate = new decimal_js_1.Decimal(item.taxRate || 20).dividedBy(100);
            const taxAmt = netSubtotal.times(taxRate);
            const withRate = new decimal_js_1.Decimal(item.withholdingRate || 0).dividedBy(100);
            const withholdingAmt = taxAmt.times(withRate);
            const netTax = taxAmt.minus(withholdingAmt);
            const lineTotal = netSubtotal.plus(netTax);
            globalSubtotal = globalSubtotal.plus(netSubtotal);
            globalDiscount = globalDiscount.plus(discountAmt);
            globalTax = globalTax.plus(taxAmt);
            globalWithholding = globalWithholding.plus(withholdingAmt);
            globalTotal = globalTotal.plus(lineTotal);
            return {
                description: item.description,
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                unit: item.unit,
                discountRate: item.discountRate || 0,
                discountAmount: discountAmt.toDecimalPlaces(2, decimal_js_1.Decimal.ROUND_HALF_UP).toNumber(),
                taxRate: item.taxRate || 20,
                withholdingRate: item.withholdingRate || 0,
                lineSubtotal: netSubtotal.toDecimalPlaces(2, decimal_js_1.Decimal.ROUND_HALF_UP).toNumber(),
                lineTax: taxAmt.toDecimalPlaces(2, decimal_js_1.Decimal.ROUND_HALF_UP).toNumber(),
                lineWithholding: withholdingAmt.toDecimalPlaces(2, decimal_js_1.Decimal.ROUND_HALF_UP).toNumber(),
                lineTotal: lineTotal.toDecimalPlaces(2, decimal_js_1.Decimal.ROUND_HALF_UP).toNumber(),
            };
        });
        return {
            calculatedItems,
            totals: {
                subtotal: globalSubtotal.toDecimalPlaces(2, decimal_js_1.Decimal.ROUND_HALF_UP).toNumber(),
                discountAmount: globalDiscount.toDecimalPlaces(2, decimal_js_1.Decimal.ROUND_HALF_UP).toNumber(),
                taxAmount: globalTax.toDecimalPlaces(2, decimal_js_1.Decimal.ROUND_HALF_UP).toNumber(),
                withholdingTotal: globalWithholding.toDecimalPlaces(2, decimal_js_1.Decimal.ROUND_HALF_UP).toNumber(),
                totalAmount: globalTotal.toDecimalPlaces(2, decimal_js_1.Decimal.ROUND_HALF_UP).toNumber(),
            }
        };
    }
};
exports.InvoiceCalculatorService = InvoiceCalculatorService;
exports.InvoiceCalculatorService = InvoiceCalculatorService = __decorate([
    (0, common_1.Injectable)()
], InvoiceCalculatorService);
//# sourceMappingURL=invoice-items.service.js.map