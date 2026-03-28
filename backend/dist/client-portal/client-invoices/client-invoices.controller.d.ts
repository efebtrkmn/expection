import { Response } from 'express';
import { ClientInvoicesService } from './client-invoices.service';
import { ClientStatementService } from '../client-statement/client-statement.service';
export declare class ClientInvoicesController {
    private readonly invoicesService;
    private readonly statementService;
    constructor(invoicesService: ClientInvoicesService, statementService: ClientStatementService);
    getSummary(req: any): Promise<{
        totalDebt: number;
        overdueAmount: number;
        totalPaid: number;
        invoiceCount: number;
    }>;
    getInvoices(req: any): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.InvoiceStatus;
        invoiceNumber: string;
        issueDate: Date;
        dueDate: Date;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        currency: string;
        eInvoiceStatus: import(".prisma/client").$Enums.EInvoiceStatus;
    }[]>;
    getInvoiceDetail(id: string, req: any): Promise<{
        items: {
            id: string;
            createdAt: Date;
            tenantId: string;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            exchangeRate: import("@prisma/client/runtime/library").Decimal;
            invoiceId: string;
            description: string;
            unit: import(".prisma/client").$Enums.ProductUnit;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            taxRate: number;
            productId: string | null;
            quantity: import("@prisma/client/runtime/library").Decimal;
            discountRate: import("@prisma/client/runtime/library").Decimal;
            withholdingRate: import("@prisma/client/runtime/library").Decimal;
            lineSubtotal: import("@prisma/client/runtime/library").Decimal;
            lineTax: import("@prisma/client/runtime/library").Decimal;
            lineWithholding: import("@prisma/client/runtime/library").Decimal;
            lineTotal: import("@prisma/client/runtime/library").Decimal;
        }[];
    } & {
        id: string;
        status: import(".prisma/client").$Enums.InvoiceStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        type: import(".prisma/client").$Enums.InvoiceType;
        notes: string | null;
        customerSupplierId: string;
        invoiceNumber: string;
        issueDate: Date;
        dueDate: Date | null;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        withholdingTotal: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        currency: string;
        exchangeRate: import("@prisma/client/runtime/library").Decimal;
        originalCurrency: string;
        journalEntryId: string | null;
        eInvoiceUuid: string | null;
        eArchiveUrl: string | null;
        eInvoiceStatus: import(".prisma/client").$Enums.EInvoiceStatus;
        eInvoiceXml: string | null;
        eInvoiceSentAt: Date | null;
        eInvoiceError: string | null;
        lineItems: import("@prisma/client/runtime/library").JsonValue | null;
        createdById: string;
    }>;
    downloadPdf(req: any, res: Response): Promise<void>;
}
