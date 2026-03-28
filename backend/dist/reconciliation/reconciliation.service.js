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
var ReconciliationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconciliationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const schedule_1 = require("@nestjs/schedule");
const decimal_js_1 = require("decimal.js");
const crypto = require("crypto");
let ReconciliationService = ReconciliationService_1 = class ReconciliationService {
    constructor(prisma, mailService, config) {
        this.prisma = prisma;
        this.mailService = mailService;
        this.config = config;
        this.logger = new common_1.Logger(ReconciliationService_1.name);
    }
    async sendReconciliation(dto, tenantId, userId) {
        const customer = await this.prisma.customerSupplier.findFirst({
            where: { id: dto.customerSupplierId, tenantId },
            select: { id: true, name: true, email: true },
        });
        if (!customer)
            throw new common_1.NotFoundException('Cari hesap bulunamadı');
        if (!customer.email)
            throw new common_1.BadRequestException('Carinin e-posta adresi kayıtlı değil');
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
        const periodDays = settings?.reconciliationPeriodDays ?? 7;
        const snapshot = await this.buildStatementSnapshot(dto.customerSupplierId, tenantId);
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);
        await this.prisma.reconciliationRequest.create({
            data: {
                tenantId,
                customerSupplierId: dto.customerSupplierId,
                tokenHash,
                expiresAt,
                statementSnapshot: snapshot,
                createdById: userId,
            },
        });
        const portalUrl = this.config.get('CLIENT_PORTAL_URL', 'https://portal.expection.com');
        const link = `${portalUrl}/reconcile?token=${rawToken}`;
        await this.mailService.sendReconciliationLink(customer.email, {
            customerName: customer.name,
            tenantName: tenant?.name || 'İşletmeniz',
            link,
            expiresAt,
            totalDebt: snapshot.totalDebt,
        });
        this.logger.log(`Mutabakat gönderildi: ${customer.name} (${periodDays} gün süre)`);
        return {
            message: `Mutabakat bildirimi ${customer.email} adresine gönderildi`,
            expiresAt,
            periodDays,
        };
    }
    async verifyToken(rawToken) {
        const req = await this.findValidRequest(rawToken);
        return {
            statement: req.statementSnapshot,
            customerSupplierId: req.customerSupplierId,
            expiresAt: req.expiresAt,
            expiresInHours: Math.round((req.expiresAt.getTime() - Date.now()) / 3600000),
        };
    }
    async respond(rawToken, dto, ipAddress) {
        const req = await this.findValidRequest(rawToken);
        if (req.status !== client_1.ReconciliationStatus.PENDING) {
            throw new common_1.BadRequestException('Bu mutabakat talebi zaten yanıtlanmış.');
        }
        const newStatus = dto.decision === 'APPROVED'
            ? client_1.ReconciliationStatus.APPROVED
            : client_1.ReconciliationStatus.REJECTED;
        await this.prisma.reconciliationRequest.update({
            where: { id: req.id },
            data: {
                status: newStatus,
                respondedAt: new Date(),
                responseIp: ipAddress,
                responseNote: dto.note,
            },
        });
        const adminUser = await this.prisma.user.findFirst({
            where: { tenantId: req.tenantId, role: 'SuperAdmin', isActive: true },
            select: { email: true },
        });
        if (adminUser?.email) {
            const cs = await this.prisma.customerSupplier.findUnique({
                where: { id: req.customerSupplierId },
                select: { name: true },
            });
            const tenant = await this.prisma.tenant.findUnique({ where: { id: req.tenantId } });
            await this.mailService.send(adminUser.email, `Mutabakat ${dto.decision === 'APPROVED' ? 'Onaylandi' : 'Reddedildi'}`, 'admin-reconciliation-response', { customerName: cs?.name, decision: dto.decision, note: dto.note, ip: ipAddress, tenantName: tenant?.name });
        }
        this.logger.log(`Mutabakat yanıtlandı: ${newStatus} — IP: ${ipAddress}`);
        return {
            message: dto.decision === 'APPROVED' ? 'Mutabakat onaylandı.' : 'Mutabakat reddedildi.',
            status: newStatus,
            respondedAt: new Date(),
        };
    }
    async processTacitApprovals() {
        this.logger.log('[CRON] Zımni kabul kontrolü başlatılıyor...');
        const expired = await this.prisma.reconciliationRequest.findMany({
            where: {
                status: client_1.ReconciliationStatus.PENDING,
                expiresAt: { lt: new Date() },
            },
        });
        this.logger.log(`${expired.length} zımni kabul tespit edildi`);
        for (const req of expired) {
            await this.prisma.reconciliationRequest.update({
                where: { id: req.id },
                data: {
                    status: client_1.ReconciliationStatus.TACIT_APPROVED,
                    respondedAt: new Date(),
                    responseNote: 'Sure dolmasi nedeniyle zimni kabul',
                },
            });
            const adminUser = await this.prisma.user.findFirst({
                where: { tenantId: req.tenantId, role: 'SuperAdmin', isActive: true },
                select: { email: true },
            });
            const tenant = await this.prisma.tenant.findUnique({ where: { id: req.tenantId }, select: { name: true } });
            const cs = await this.prisma.customerSupplier.findUnique({ where: { id: req.customerSupplierId }, select: { name: true } });
            if (adminUser?.email) {
                await this.mailService.sendTacitApprovalNotice(adminUser.email, {
                    customerName: cs?.name || 'Bilinmeyen',
                    tenantName: tenant?.name || 'Isletme',
                    period: `${(req.expiresAt.getTime() - req.sentAt.getTime()) / 86400000} gun`,
                });
            }
        }
        this.logger.log(`Zımni kabul tamamlandı: ${expired.length} kayıt güncellendi`);
    }
    async list(tenantId) {
        return this.prisma.reconciliationRequest.findMany({
            where: { tenantId },
            include: { customerSupplier: { select: { name: true, email: true } } },
            orderBy: { sentAt: 'desc' },
        });
    }
    async findValidRequest(rawToken) {
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const req = await this.prisma.reconciliationRequest.findUnique({ where: { tokenHash } });
        if (!req)
            throw new common_1.NotFoundException('Geçersiz mutabakat bağlantısı');
        if (new Date() > req.expiresAt) {
            throw new common_1.GoneException('Bu mutabakat bağlantısının süresi dolmuş.');
        }
        return req;
    }
    async buildStatementSnapshot(contactId, tenantId) {
        const invoices = await this.prisma.invoice.findMany({
            where: {
                tenantId,
                customerSupplierId: contactId,
                status: { notIn: [client_1.InvoiceStatus.DRAFT, client_1.InvoiceStatus.PAID] },
            },
            select: { invoiceNumber: true, issueDate: true, dueDate: true, totalAmount: true, status: true },
        });
        const totalDebt = invoices.reduce((s, i) => s.plus(i.totalAmount), new decimal_js_1.Decimal(0));
        return {
            generatedAt: new Date().toISOString(),
            invoiceCount: invoices.length,
            totalDebt: totalDebt.toNumber(),
            invoices: invoices.map(i => ({
                ...i,
                totalAmount: Number(i.totalAmount),
            })),
        };
    }
};
exports.ReconciliationService = ReconciliationService;
__decorate([
    (0, schedule_1.Cron)('0 9 * * *', { name: 'tacit_approval_worker', timeZone: 'Europe/Istanbul' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReconciliationService.prototype, "processTacitApprovals", null);
exports.ReconciliationService = ReconciliationService = ReconciliationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService,
        config_1.ConfigService])
], ReconciliationService);
//# sourceMappingURL=reconciliation.service.js.map