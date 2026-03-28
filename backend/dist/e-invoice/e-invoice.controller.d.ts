import { RawBodyRequest } from '@nestjs/common';
import { Response, Request } from 'express';
import { EInvoiceService } from './e-invoice.service';
import { EInvoiceWebhookDto } from './dto/webhook-payload.dto';
export declare class EInvoiceController {
    private readonly eInvoiceService;
    constructor(eInvoiceService: EInvoiceService);
    sendInvoice(invoiceId: string, tenantId: string, userId: string): Promise<{
        invoiceId: string;
        uuid: string;
        status: string;
        referenceId: string;
    }>;
    queryStatus(invoiceId: string, tenantId: string): Promise<import("./integrator-client.service").IntegratorStatusResult>;
    getXml(invoiceId: string, tenantId: string, res: Response): Promise<Response<any, Record<string, any>>>;
    handleWebhook(dto: EInvoiceWebhookDto, signature: string, req: RawBodyRequest<Request>): Promise<{
        received: boolean;
        invoiceId?: undefined;
        newStatus?: undefined;
    } | {
        received: boolean;
        invoiceId: string;
        newStatus: import(".prisma/client").$Enums.EInvoiceStatus;
    }>;
}
