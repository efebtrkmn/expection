import { PrismaService } from '../prisma/prisma.service';
import { UblBuilderService } from './ubl-builder.service';
import { IntegratorClientService } from './integrator-client.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditLogService } from '../audit-log/audit-log.service';
import { EInvoiceWebhookDto } from './dto/webhook-payload.dto';
import { ConfigService } from '@nestjs/config';
export declare class EInvoiceService {
    private readonly prisma;
    private readonly ublBuilder;
    private readonly integratorClient;
    private readonly eventEmitter;
    private readonly auditLog;
    private readonly config;
    private readonly logger;
    constructor(prisma: PrismaService, ublBuilder: UblBuilderService, integratorClient: IntegratorClientService, eventEmitter: EventEmitter2, auditLog: AuditLogService, config: ConfigService);
    sendInvoice(invoiceId: string, tenantId: string, userId: string): Promise<{
        invoiceId: string;
        uuid: string;
        status: string;
        referenceId: string;
    }>;
    queryStatus(invoiceId: string, tenantId: string): Promise<import("./integrator-client.service").IntegratorStatusResult>;
    getXml(invoiceId: string, tenantId: string): Promise<string>;
    handleWebhook(dto: EInvoiceWebhookDto, rawBody: string, signature: string): Promise<{
        received: boolean;
        invoiceId?: undefined;
        newStatus?: undefined;
    } | {
        received: boolean;
        invoiceId: string;
        newStatus: import(".prisma/client").$Enums.EInvoiceStatus;
    }>;
    private verifyWebhookSignature;
    private mapGibStatus;
}
