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
exports.AccountsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_log_service_1 = require("../audit-log/audit-log.service");
const client_1 = require("@prisma/client");
let AccountsService = class AccountsService {
    constructor(prisma, auditLogService) {
        this.prisma = prisma;
        this.auditLogService = auditLogService;
    }
    async findAll(tenantId) {
        return this.prisma.account.findMany({
            where: { tenantId },
            orderBy: { code: 'asc' },
        });
    }
    async findOne(id, tenantId) {
        const account = await this.prisma.account.findFirst({
            where: { id, tenantId },
        });
        if (!account)
            throw new common_1.NotFoundException('Hesap bulunamadı');
        return account;
    }
    async create(dto, tenantId, userId, ip) {
        const existing = await this.prisma.account.findFirst({
            where: { tenantId, code: dto.code },
        });
        if (existing)
            throw new common_1.ConflictException('Bu hesap kodu zaten kullanımda');
        const account = await this.prisma.account.create({
            data: {
                ...dto,
                tenantId,
                isSystem: false,
            },
        });
        await this.auditLogService.logEntityChange({
            tenantId,
            userId,
            action: client_1.AuditAction.CREATE,
            entityType: 'account',
            entityId: account.id,
            newValues: account,
            ipAddress: ip,
        });
        return account;
    }
    async update(id, dto, tenantId, userId, ip) {
        const account = await this.findOne(id, tenantId);
        const updated = await this.prisma.account.update({
            where: { id },
            data: dto,
        });
        await this.auditLogService.logEntityChange({
            tenantId,
            userId,
            action: client_1.AuditAction.UPDATE,
            entityType: 'account',
            entityId: account.id,
            oldValues: account,
            newValues: updated,
            ipAddress: ip,
        });
        return updated;
    }
    async delete(id, tenantId, userId, ip) {
        const account = await this.findOne(id, tenantId);
        if (account.isSystem) {
            throw new common_1.ForbiddenException('Sistem hesapları silinemez.');
        }
        const hasTransactions = await this.prisma.ledgerLine.findFirst({
            where: { accountId: id, tenantId },
        });
        if (hasTransactions) {
            throw new common_1.ConflictException('Hareketi olan hesap silinemez. Lütfen önce hareketleri iptal edin veya hesabı pasife alın.');
        }
        await this.prisma.account.delete({ where: { id } });
        await this.auditLogService.logEntityChange({
            tenantId,
            userId,
            action: client_1.AuditAction.DELETE,
            entityType: 'account',
            entityId: account.id,
            oldValues: account,
            ipAddress: ip,
        });
    }
};
exports.AccountsService = AccountsService;
exports.AccountsService = AccountsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_log_service_1.AuditLogService])
], AccountsService);
//# sourceMappingURL=accounts.service.js.map