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
export declare class InvoiceCalculatorService {
    calculateItems(items: InvoiceItemDto[]): {
        calculatedItems: CalculatedItem[];
        totals: InvoiceTotals;
    };
}
