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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientInvoicesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const decimal_js_1 = require("decimal.js");
const client_1 = require("@prisma/client");
let ClientInvoicesService = class ClientInvoicesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMyInvoices(contactId, tenantId) {
        return this.prisma.invoice.findMany({
            where: {
                tenantId,
                customerSupplierId: contactId,
                status: { not: client_1.InvoiceStatus.DRAFT },
            },
            select: {
                id: true,
                invoiceNumber: true,
                issueDate: true,
                dueDate: true,
                totalAmount: true,
                currency: true,
                status: true,
                eInvoiceStatus: true,
            },
            orderBy: { issueDate: 'desc' },
        });
    }
    async getMyInvoiceDetail(invoiceId, contactId, tenantId) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, tenantId },
            include: { items: true },
        });
        if (!invoice)
            throw new common_1.NotFoundException('Fatura bulunamadı');
        if (invoice.customerSupplierId !== contactId) {
            throw new common_1.ForbiddenException('Bu faturaya erişim yetkiniz bulunmuyor.');
        }
        return invoice;
    }
    async getMySummary(contactId, tenantId) {
        const invoices = await this.prisma.invoice.findMany({
            where: { tenantId, customerSupplierId: contactId, status: { not: client_1.InvoiceStatus.DRAFT } },
            select: { totalAmount: true, status: true, dueDate: true },
        });
        const totalDebt = invoices
            .filter(i => i.status === client_1.InvoiceStatus.ISSUED || i.status === client_1.InvoiceStatus.SENT || i.status === client_1.InvoiceStatus.OVERDUE)
            .reduce((sum, i) => sum.plus(i.totalAmount), new decimal_js_1.Decimal(0));
        const overdue = invoices
            .filter(i => i.dueDate && new Date(i.dueDate) < new Date() && i.status !== client_1.InvoiceStatus.PAID)
            .reduce((sum, i) => sum.plus(i.totalAmount), new decimal_js_1.Decimal(0));
        const paid = invoices
            .filter(i => i.status === client_1.InvoiceStatus.PAID)
            .reduce((sum, i) => sum.plus(i.totalAmount), new decimal_js_1.Decimal(0));
        return {
            totalDebt: totalDebt.toNumber(),
            overdueAmount: overdue.toNumber(),
            totalPaid: paid.toNumber(),
            invoiceCount: invoices.length,
        };
    }
};
exports.ClientInvoicesService = ClientInvoicesService;
exports.ClientInvoicesService = ClientInvoicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ClientInvoicesService);
//# sourceMappingURL=client-invoices.service.js.map