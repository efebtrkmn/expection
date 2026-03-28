"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EInvoiceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EInvoiceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const ubl_builder_service_1 = require("./ubl-builder.service");
const integrator_client_service_1 = require("./integrator-client.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const audit_log_service_1 = require("../audit-log/audit-log.service");
const client_1 = require("@prisma/client");
const config_1 = require("@nestjs/config");
const crypto = require("crypto");
const uuid_1 = require("uuid");
let EInvoiceService = EInvoiceService_1 = class EInvoiceService {
    constructor(prisma, ublBuilder, integratorClient, eventEmitter, auditLog, config) {
        this.prisma = prisma;
        this.ublBuilder = ublBuilder;
        this.integratorClient = integratorClient;
        this.eventEmitter = eventEmitter;
        this.auditLog = auditLog;
        this.config = config;
        this.logger = new common_1.Logger(EInvoiceService_1.name);
    }
    async sendInvoice(invoiceId, tenantId, userId) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, tenantId },
            include: {
                items: { include: { product: true } },
                customerSupplier: true,
            },
        });
        if (!invoice)
            throw new common_1.NotFoundException('Fatura bulunamadı');
        if (invoice.status === client_1.InvoiceStatus.DRAFT) {
            throw new common_1.BadRequestException('Taslak faturalar e-fatura olarak gönderilemez. Önce resmileştirin.');
        }
        if (invoice.eInvoiceStatus === client_1.EInvoiceStatus.ACCEPTED) {
            throw new common_1.BadRequestException('Bu fatura zaten GİB tarafından kabul edilmiş.');
        }
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant bulunamadı');
        const docUuid = invoice.eInvoiceUuid || (0, uuid_1.v4)();
        const xmlContent = this.ublBuilder.buildXml({ ...invoice, eInvoiceUuid: docUuid }, tenant);
        await this.prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                eInvoiceUuid: docUuid,
                eInvoiceXml: xmlContent,
                eInvoiceStatus: client_1.EInvoiceStatus.PENDING,
                eInvoiceSentAt: new Date(),
            },
        });
        const result = await this.integratorClient.sendInvoice(xmlContent, docUuid, invoice.invoiceNumber);
        await this.prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                eInvoiceStatus: result.success ? client_1.EInvoiceStatus.PENDING : client_1.EInvoiceStatus.REJECTED,
                eInvoiceError: result.success ? null : result.message,
            },
        });
        await this.auditLog.logEntityChange({
            tenantId,
            userId,
            action: client_1.AuditAction.UPDATE,
            entityType: 'e_invoice_send',
            entityId: invoiceId,
            newValues: { uuid: docUuid, status: 'PENDING', integrator: result },
        });
        this.logger.log(`e-Fatura gönderildi: ${invoice.invoiceNumber} → ${result.status}`);
        return { invoiceId, uuid: docUuid, status: result.status, referenceId: result.referenceId };
    }
    async queryStatus(invoiceId, tenantId) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, tenantId },
            select: { eInvoiceUuid: true, eInvoiceStatus: true, invoiceNumber: true },
        });
        if (!invoice)
            throw new common_1.NotFoundException('Fatura bulunamadı');
        if (!invoice.eInvoiceUuid)
            throw new common_1.BadRequestException('Bu fatura henüz entegratöre gönderilmemiş');
        const statusResult = await this.integratorClient.queryStatus(invoice.eInvoiceUuid);
        await this.prisma.invoice.update({
            where: { id: invoiceId },
            data: { eInvoiceStatus: statusResult.status },
        });
        return statusResult;
    }
    async getXml(invoiceId, tenantId) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, tenantId },
            select: { eInvoiceXml: true, invoiceNumber: true },
        });
        if (!invoice)
            throw new common_1.NotFoundException('Fatura bulunamadı');
        if (!invoice.eInvoiceXml)
            throw new common_1.BadRequestException('Bu fatura için henüz XML üretilmemiş');
        return invoice.eInvoiceXml;
    }
    async handleWebhook(dto, rawBody, signature) {
        this.verifyWebhookSignature(rawBody, signature);
        const invoice = await this.prisma.invoice.findFirst({
            where: { eInvoiceUuid: dto.invoiceUUID },
            select: { id: true, tenantId: true, invoiceNumber: true, eInvoiceStatus: true },
        });
        if (!invoice) {
            this.logger.warn(`Webhook: Bilinmeyen fatura UUID: ${dto.invoiceUUID}`);
            return { received: true };
        }
        const newStatus = this.mapGibStatus(dto.status);
        await this.prisma.invoice.update({
            where: { id: invoice.id },
            data: {
                eInvoiceStatus: newStatus,
                eInvoiceError: dto.status === 'REJECTED' ? (dto.gibMessage || 'GİB tarafından reddedildi') : null,
            },
        });
        this.eventEmitter.emit('einvoice.status_changed', {
            tenantId: invoice.tenantId,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            newStatus,
            gibCode: dto.gibCode,
            gibMessage: dto.gibMessage,
        });
        this.logger.log(`Webhook işlendi: ${invoice.invoiceNumber} → ${newStatus}`);
        return { received: true, invoiceId: invoice.id, newStatus };
    }
    verifyWebhookSignature(rawBody, signature) {
        const secret = this.config.get('WEBHOOK_SECRET', '');
        if (!secret) {
            this.logger.warn('WEBHOOK_SECRET env değişkeni set edilmemiş! Güvenlik bypass ediliyor (geliştirme modu)');
            return;
        }
        const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
        if (expected !== signature) {
            this.logger.error('Webhook imzası doğrulanamadı!');
            throw new common_1.UnauthorizedException('Geçersiz webhook imzası');
        }
    }
    mapGibStatus(status) {
        const map = {
            PENDING: client_1.EInvoiceStatus.PENDING,
            IN_PROGRESS: client_1.EInvoiceStatus.IN_PROGRESS,
            ACCEPTED: client_1.EInvoiceStatus.ACCEPTED,
            REJECTED: client_1.EInvoiceStatus.REJECTED,
            CANCELLED: client_1.EInvoiceStatus.CANCELLED,
        };
        return map[status] || client_1.EInvoiceStatus.PENDING;
    }
};
exports.EInvoiceService = EInvoiceService;
exports.EInvoiceService = EInvoiceService = EInvoiceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ubl_builder_service_1.UblBuilderService,
        integrator_client_service_1.IntegratorClientService,
        event_emitter_1.EventEmitter2,
        audit_log_service_1.AuditLogService,
        config_1.ConfigService])
], EInvoiceService);
//# sourceMappingURL=e-invoice.service.js.map