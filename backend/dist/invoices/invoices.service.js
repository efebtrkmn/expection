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
var InvoicesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoicesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const invoice_items_service_1 = require("./invoice-items.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const client_1 = require("@prisma/client");
const audit_log_service_1 = require("../audit-log/audit-log.service");
let InvoicesService = InvoicesService_1 = class InvoicesService {
    constructor(prisma, calculator, eventEmitter, auditLog) {
        this.prisma = prisma;
        this.calculator = calculator;
        this.eventEmitter = eventEmitter;
        this.auditLog = auditLog;
        this.logger = new common_1.Logger(InvoicesService_1.name);
    }
    async create(tenantId, userId, dto) {
        const { calculatedItems, totals } = this.calculator.calculateItems(dto.items);
        const customer = await this.prisma.customerSupplier.findFirst({
            where: { id: dto.customerSupplierId, tenantId },
        });
        if (!customer)
            throw new common_1.BadRequestException('Böyle bir müşteri/tedarikçi bulunamadı');
        return this.prisma.withTenantTransaction(tenantId, async (tx) => {
            const invoice = await tx.invoice.create({
                data: {
                    tenantId,
                    customerSupplierId: dto.customerSupplierId,
                    invoiceNumber: dto.invoiceNumber,
                    type: dto.type,
                    status: client_1.InvoiceStatus.DRAFT,
                    issueDate: new Date(dto.issueDate),
                    dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                    currency: dto.currency || 'TRY',
                    exchangeRate: dto.exchangeRate || 1.0,
                    originalCurrency: dto.currency || 'TRY',
                    notes: dto.notes,
                    subtotal: totals.subtotal,
                    discountAmount: totals.discountAmount,
                    taxAmount: totals.taxAmount,
                    withholdingTotal: totals.withholdingTotal,
                    totalAmount: totals.totalAmount,
                    createdById: userId,
                    items: {
                        create: calculatedItems.map((item) => ({
                            tenantId,
                            productId: item.productId,
                            description: item.description,
                            quantity: item.quantity,
                            unit: item.unit,
                            unitPrice: item.unitPrice,
                            discountRate: item.discountRate,
                            discountAmount: item.discountAmount,
                            taxRate: item.taxRate,
                            withholdingRate: item.withholdingRate,
                            lineSubtotal: item.lineSubtotal,
                            lineTax: item.lineTax,
                            lineWithholding: item.lineWithholding,
                            lineTotal: item.lineTotal,
                            currency: dto.currency || 'TRY',
                            exchangeRate: dto.exchangeRate || 1.0,
                        })),
                    },
                },
                include: { items: true },
            });
            await this.auditLog.logEntityChange({
                tenantId,
                userId,
                action: client_1.AuditAction.CREATE,
                entityType: 'invoice',
                entityId: invoice.id,
                newValues: invoice,
            });
            this.logger.log(`Invoice DRAFT created: ${invoice.invoiceNumber}. Total: ${totals.totalAmount}`);
            return invoice;
        });
    }
    async findAll(tenantId) {
        return this.prisma.invoice.findMany({
            where: { tenantId },
            include: { customerSupplier: { select: { name: true, taxNumber: true } } },
            orderBy: { issueDate: 'desc' },
        });
    }
    async findOne(id, tenantId) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id, tenantId },
            include: {
                items: { include: { product: true } },
                customerSupplier: true,
                expenseJournal: true,
            },
        });
        if (!invoice)
            throw new common_1.NotFoundException('Fatura bulunamadı');
        return invoice;
    }
    async postInvoice(id, tenantId, userId) {
        const invoice = await this.findOne(id, tenantId);
        if (invoice.status !== client_1.InvoiceStatus.DRAFT) {
            throw new common_1.BadRequestException('Hata: Yalnızca TASLAK halindeki faturalar resmileştirilebilir (POST).');
        }
        const posted = await this.prisma.invoice.update({
            where: { id },
            data: { status: client_1.InvoiceStatus.ISSUED },
            include: { items: true, customerSupplier: true }
        });
        this.eventEmitter.emit('invoice.posted', {
            tenantId,
            userId,
            invoice: posted,
        });
        this.logger.log(`Invoice POSTED: ${invoice.invoiceNumber}. Event emitted to Journal & Stock Listeners.`);
        await this.auditLog.logEntityChange({
            tenantId,
            userId,
            action: client_1.AuditAction.UPDATE,
            entityType: 'invoice_post',
            entityId: posted.id,
            oldValues: { status: invoice.status },
            newValues: { status: posted.status },
        });
        return posted;
    }
};
exports.InvoicesService = InvoicesService;
exports.InvoicesService = InvoicesService = InvoicesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        invoice_items_service_1.InvoiceCalculatorService,
        event_emitter_1.EventEmitter2,
        audit_log_service_1.AuditLogService])
], InvoicesService);
//# sourceMappingURL=invoices.service.js.map