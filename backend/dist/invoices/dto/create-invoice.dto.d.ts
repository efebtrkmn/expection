import { InvoiceType, ProductUnit } from '@prisma/client';
export declare class InvoiceItemDto {
    productId?: string;
    description: string;
    quantity: number;
    unit: ProductUnit;
    unitPrice: number;
    discountRate?: number;
    taxRate?: number;
    withholdingRate?: number;
}
export declare class CreateInvoiceDto {
    customerSupplierId: string;
    invoiceNumber: string;
    type: InvoiceType;
    issueDate: string;
    dueDate?: string;
    currency?: string;
    exchangeRate?: number;
    notes?: string;
    items: InvoiceItemDto[];
}
