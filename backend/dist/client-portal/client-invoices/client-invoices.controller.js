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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientInvoicesController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_invoices_service_1 = require("./client-invoices.service");
const client_statement_service_1 = require("../client-statement/client-statement.service");
const client_jwt_guard_1 = require("../guards/client-jwt.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const roles_decorator_2 = require("../../common/decorators/roles.decorator");
const prisma_service_1 = require("../../prisma/prisma.service");
let ClientInvoicesController = class ClientInvoicesController {
    constructor(invoicesService, statementService, prisma) {
        this.invoicesService = invoicesService;
        this.statementService = statementService;
        this.prisma = prisma;
    }
    getSummary(req) {
        return this.invoicesService.getMySummary(req.clientUser.contactId, req.clientUser.tenantId);
    }
    getInvoices(req) {
        return this.invoicesService.getMyInvoices(req.clientUser.contactId, req.clientUser.tenantId);
    }
    getInvoiceDetail(id, req) {
        return this.invoicesService.getMyInvoiceDetail(id, req.clientUser.contactId, req.clientUser.tenantId);
    }
    async createInvoice(dto, req, res) {
        try {
            const result = await this.invoicesService.createInvoice(req.clientUser.contactId, req.clientUser.tenantId, dto);
            return res.status(201).json(result);
        }
        catch (err) {
            console.error('[CLIENT_INVOICE_CREATE_ERROR]', err?.message, err?.meta, err?.code);
            return res.status(400).json({
                statusCode: 400,
                message: err?.message || 'Fatura oluşturulamadı',
                detail: err?.meta?.cause || err?.meta?.target || err?.code || null,
            });
        }
    }
    deleteInvoice(id, req) {
        return this.invoicesService.deleteInvoice(id, req.clientUser.contactId, req.clientUser.tenantId);
    }
    async downloadPdf(req, res) {
        const pdf = await this.statementService.generateStatementPdf(req.clientUser.contactId, req.clientUser.tenantId);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="ekstre_${Date.now()}.pdf"`,
            'Content-Length': pdf.length,
        });
        res.end(pdf);
    }
    async getProducts(req, search) {
        const where = { tenantId: req.clientUser.tenantId, isActive: true };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
            ];
        }
        return this.prisma.product.findMany({
            where,
            orderBy: { name: 'asc' },
        });
    }
    async createProduct(dto, req, res) {
        try {
            const result = await this.prisma.product.create({
                data: {
                    tenantId: req.clientUser.tenantId,
                    code: dto.code,
                    name: dto.name,
                    description: dto.description || null,
                    unit: dto.unit || 'ADET',
                    unitPrice: dto.unitPrice || 0,
                    taxRate: dto.taxRate ?? 20,
                    stockQuantity: dto.stockQuantity || 0,
                    criticalStockLevel: dto.criticalStockLevel || 5,
                    trackStock: dto.trackStock ?? true,
                },
            });
            return res.status(201).json(result);
        }
        catch (err) {
            console.error('[CLIENT_PRODUCT_CREATE_ERROR]', err?.message);
            return res.status(400).json({
                statusCode: 400,
                message: err?.message || 'Ürün oluşturulamadı',
            });
        }
    }
    async deleteProduct(id, req) {
        await this.prisma.product.updateMany({
            where: { id, tenantId: req.clientUser.tenantId },
            data: { isActive: false },
        });
        return { success: true, message: 'Ürün pasife alındı' };
    }
    async getTransactions(req) {
        return this.prisma.transaction.findMany({
            where: { tenantId: req.clientUser.tenantId },
            include: {
                customerSupplier: {
                    select: { id: true, name: true, type: true }
                }
            },
            orderBy: { transactionDate: 'desc' },
            take: 100,
        });
    }
    async createTransaction(dto, req, res) {
        try {
            const tenantUser = await this.prisma.user.findFirst({
                where: { tenantId: req.clientUser.tenantId },
                select: { id: true },
            });
            if (!tenantUser) {
                return res.status(400).json({ statusCode: 400, message: 'Tenant kullanıcısı bulunamadı' });
            }
            const transactionData = {
                tenantId: req.clientUser.tenantId,
                type: dto.type || 'INCOME',
                amount: dto.amount,
                currency: dto.currency || 'TRY',
                description: dto.description || null,
                transactionDate: new Date(dto.transactionDate || new Date()),
                paymentMethod: dto.paymentMethod || 'BANK_TRANSFER',
                referenceNumber: dto.referenceNumber || null,
                createdById: tenantUser.id,
            };
            if (dto.customerSupplierId) {
                transactionData.customerSupplierId = dto.customerSupplierId;
            }
            const result = await this.prisma.$transaction(async (tx) => {
                const createdTx = await tx.transaction.create({ data: transactionData });
                if (dto.customerSupplierId) {
                    const contact = await tx.customerSupplier.findUnique({ where: { id: dto.customerSupplierId } });
                    if (contact) {
                        let newBalance = Number(contact.balance);
                        if (transactionData.type === 'INCOME') {
                            newBalance -= Number(transactionData.amount);
                        }
                        else {
                            newBalance += Number(transactionData.amount);
                        }
                        await tx.customerSupplier.update({
                            where: { id: contact.id },
                            data: { balance: newBalance }
                        });
                    }
                }
                return createdTx;
            });
            return res.status(201).json(result);
        }
        catch (err) {
            console.error('[CLIENT_TRANSACTION_CREATE_ERROR]', err?.message);
            return res.status(400).json({
                statusCode: 400,
                message: err?.message || 'İşlem oluşturulamadı',
            });
        }
    }
    async getContactsPivot(req) {
        const tenantId = req.clientUser.tenantId;
        const contacts = await this.prisma.customerSupplier.findMany({
            where: { tenantId, isActive: true },
            include: {
                invoices: {
                    select: {
                        id: true,
                        totalAmount: true,
                        status: true,
                        issueDate: true,
                        dueDate: true,
                        invoiceNumber: true,
                        type: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
        return contacts.map((c) => {
            const invoices = c.invoices || [];
            const totalDebt = invoices
                .filter((i) => ['ISSUED', 'SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(i.status))
                .reduce((sum, i) => sum + Number(i.totalAmount), 0);
            const totalPaid = invoices
                .filter((i) => i.status === 'PAID')
                .reduce((sum, i) => sum + Number(i.totalAmount), 0);
            const overdueInvoices = invoices.filter((i) => i.status === 'OVERDUE');
            const overdueAmount = overdueInvoices.reduce((sum, i) => sum + Number(i.totalAmount), 0);
            const lastInvoice = invoices.length > 0
                ? invoices.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())[0]
                : null;
            const nextDueInvoice = invoices
                .filter((i) => i.dueDate && ['ISSUED', 'SENT', 'PARTIALLY_PAID'].includes(i.status))
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0] || null;
            return {
                id: c.id,
                name: c.name,
                type: c.type,
                phone: c.phone,
                email: c.email,
                city: c.city,
                address: c.address,
                taxNumber: c.taxNumber,
                balance: Number(c.balance),
                invoiceCount: invoices.length,
                totalDebt,
                totalPaid,
                remaining: totalDebt,
                overdueAmount,
                overdueCount: overdueInvoices.length,
                lastInvoiceDate: lastInvoice?.issueDate || null,
                nextDueDate: nextDueInvoice?.dueDate || null,
            };
        });
    }
    async getContacts(req, search, type) {
        const where = { tenantId: req.clientUser.tenantId, isActive: true };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { taxNumber: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (type && type !== 'ALL') {
            where.type = type;
        }
        return this.prisma.customerSupplier.findMany({
            where,
            orderBy: { name: 'asc' },
        });
    }
    async createContact(dto, req, res) {
        try {
            const result = await this.prisma.customerSupplier.create({
                data: {
                    tenantId: req.clientUser.tenantId,
                    name: dto.name,
                    type: dto.type || 'CUSTOMER',
                    taxNumber: dto.taxNumber || null,
                    taxOffice: dto.taxOffice || null,
                    address: dto.address || null,
                    city: dto.city || null,
                    phone: dto.phone || null,
                    email: dto.email || null,
                    notes: dto.notes || null,
                },
            });
            return res.status(201).json(result);
        }
        catch (err) {
            console.error('[CLIENT_CONTACT_CREATE_ERROR]', err?.message);
            return res.status(400).json({
                statusCode: 400,
                message: err?.message || 'Cari oluşturulamadı',
            });
        }
    }
    async getContactSummary(id, req) {
        const tenantId = req.clientUser.tenantId;
        const contact = await this.prisma.customerSupplier.findFirst({
            where: { id, tenantId, isActive: true },
        });
        if (!contact)
            return { error: 'Cari bulunamadı' };
        const invoices = await this.prisma.invoice.findMany({
            where: { customerSupplierId: id, tenantId },
            orderBy: { issueDate: 'desc' },
            select: {
                id: true,
                invoiceNumber: true,
                type: true,
                status: true,
                totalAmount: true,
                issueDate: true,
                dueDate: true,
            },
        });
        const totalDebt = invoices
            .filter((i) => ['ISSUED', 'SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(i.status))
            .reduce((sum, i) => sum + Number(i.totalAmount), 0);
        const totalPaid = invoices
            .filter((i) => i.status === 'PAID')
            .reduce((sum, i) => sum + Number(i.totalAmount), 0);
        return {
            contact,
            invoices,
            totalDebt,
            totalPaid,
            remaining: totalDebt,
            invoiceCount: invoices.length,
        };
    }
    async deleteContact(id, req) {
        await this.prisma.customerSupplier.updateMany({
            where: { id, tenantId: req.clientUser.tenantId },
            data: { isActive: false },
        });
        return { success: true, message: 'Cari pasife alındı' };
    }
};
exports.ClientInvoicesController = ClientInvoicesController;
__decorate([
    (0, common_1.Get)('summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Musteri Bakiye Ozeti' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ClientInvoicesController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('invoices'),
    (0, swagger_1.ApiOperation)({ summary: 'Kendi Faturalarim' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ClientInvoicesController.prototype, "getInvoices", null);
__decorate([
    (0, common_1.Get)('invoices/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Fatura Detayi' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ClientInvoicesController.prototype, "getInvoiceDetail", null);
__decorate([
    (0, common_1.Post)('invoices'),
    (0, swagger_1.ApiOperation)({ summary: 'Yeni Fatura Olustur (Taslak)' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ClientInvoicesController.prototype, "createInvoice", null);
__decorate([
    (0, common_1.Delete)('invoices/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Taslak Fatura Sil' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ClientInvoicesController.prototype, "deleteInvoice", null);
__decorate([
    (0, common_1.Get)('statement/pdf'),
    (0, swagger_1.ApiOperation)({ summary: 'Cari Ekstre PDF Indir' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ClientInvoicesController.prototype, "downloadPdf", null);
__decorate([
    (0, common_1.Get)('products'),
    (0, swagger_1.ApiOperation)({ summary: 'Urunleri Listele' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ClientInvoicesController.prototype, "getProducts", null);
__decorate([
    (0, common_1.Post)('products'),
    (0, swagger_1.ApiOperation)({ summary: 'Yeni Urun Ekle' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ClientInvoicesController.prototype, "createProduct", null);
__decorate([
    (0, common_1.Delete)('products/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Urun Sil' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ClientInvoicesController.prototype, "deleteProduct", null);
__decorate([
    (0, common_1.Get)('transactions'),
    (0, swagger_1.ApiOperation)({ summary: 'Gelir/Gider Islemlerini Listele' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ClientInvoicesController.prototype, "getTransactions", null);
__decorate([
    (0, common_1.Post)('transactions'),
    (0, swagger_1.ApiOperation)({ summary: 'Yeni Gelir/Gider Islemi Ekle' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ClientInvoicesController.prototype, "createTransaction", null);
__decorate([
    (0, common_1.Get)('contacts/pivot'),
    (0, swagger_1.ApiOperation)({ summary: 'Cari Pivot Tablo Verisi' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ClientInvoicesController.prototype, "getContactsPivot", null);
__decorate([
    (0, common_1.Get)('contacts'),
    (0, swagger_1.ApiOperation)({ summary: 'Carileri Listele' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ClientInvoicesController.prototype, "getContacts", null);
__decorate([
    (0, common_1.Post)('contacts'),
    (0, swagger_1.ApiOperation)({ summary: 'Yeni Cari Ekle' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ClientInvoicesController.prototype, "createContact", null);
__decorate([
    (0, common_1.Get)('contacts/:id/summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Cari Detay Ozeti' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ClientInvoicesController.prototype, "getContactSummary", null);
__decorate([
    (0, common_1.Delete)('contacts/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Cari Sil (Pasife Al)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ClientInvoicesController.prototype, "deleteContact", null);
exports.ClientInvoicesController = ClientInvoicesController = __decorate([
    (0, swagger_1.ApiTags)('Musteri Portali'),
    (0, roles_decorator_1.Public)(),
    (0, roles_decorator_2.SkipTenantCheck)(),
    (0, common_1.UseGuards)(client_jwt_guard_1.ClientJwtGuard),
    (0, common_1.Controller)('client'),
    __metadata("design:paramtypes", [client_invoices_service_1.ClientInvoicesService,
        client_statement_service_1.ClientStatementService,
        prisma_service_1.PrismaService])
], ClientInvoicesController);
//# sourceMappingURL=client-invoices.controller.js.map