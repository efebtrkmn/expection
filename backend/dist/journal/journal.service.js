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
var JournalService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JournalService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_log_service_1 = require("../audit-log/audit-log.service");
const client_1 = require("@prisma/client");
const decimal_js_1 = require("decimal.js");
let JournalService = JournalService_1 = class JournalService {
    constructor(prisma, auditLog) {
        this.prisma = prisma;
        this.auditLog = auditLog;
        this.logger = new common_1.Logger(JournalService_1.name);
    }
    async postJournalEntry(dto, tenantId, userId) {
        let totalDebit = new decimal_js_1.Decimal(0);
        let totalCredit = new decimal_js_1.Decimal(0);
        for (const line of dto.lines) {
            if (line.debit > 0 && line.credit > 0) {
                throw new common_1.UnprocessableEntityException('Bir satırda hem borç hem alacak olamaz.');
            }
            totalDebit = totalDebit.plus(line.debit);
            totalCredit = totalCredit.plus(line.credit);
        }
        if (!totalDebit.equals(totalCredit)) {
            throw new common_1.UnprocessableEntityException(`Yevmiye dengesi hatalı! Borç Toplamı: ${totalDebit.toFixed(2)}, Alacak Toplamı: ${totalCredit.toFixed(2)}`);
        }
        try {
            return await this.prisma.withTenantTransaction(tenantId, async (tx) => {
                const existing = await tx.journalEntry.findFirst({
                    where: { tenantId, entryNumber: dto.entryNumber }
                });
                if (existing) {
                    throw new common_1.UnprocessableEntityException(`Fiş numarası (${dto.entryNumber}) zaten kullanımda`);
                }
                const isPosted = dto.status === client_1.JournalStatus.POSTED;
                const entry = await tx.journalEntry.create({
                    data: {
                        tenantId,
                        entryNumber: dto.entryNumber,
                        entryDate: new Date(dto.entryDate),
                        description: dto.description,
                        referenceType: dto.referenceType,
                        referenceId: dto.referenceId,
                        status: dto.status || client_1.JournalStatus.DRAFT,
                        totalAmount: totalDebit.toNumber(),
                        postedAt: isPosted ? new Date() : null,
                        createdById: userId,
                        lines: {
                            create: dto.lines.map((l) => ({
                                tenantId,
                                accountId: l.accountId,
                                description: l.description,
                                debit: l.debit,
                                credit: l.credit,
                                currency: l.currency || 'TRY',
                                exchangeRate: l.exchangeRate || 1.0,
                            })),
                        },
                    },
                    include: { lines: true }
                });
                await this.auditLog.logEntityChange({
                    tenantId,
                    userId,
                    action: client_1.AuditAction.CREATE,
                    entityType: 'journal_entry',
                    entityId: entry.id,
                    newValues: { ...entry, lines: dto.lines },
                });
                this.logger.log(`Yevmiye Başarıyla Oluşturuldu: ${entry.entryNumber} [DB: ${totalDebit}]`);
                return entry;
            });
        }
        catch (error) {
            if (error instanceof common_1.UnprocessableEntityException) {
                throw error;
            }
            this.logger.error(`Yevmiye kaydı hatası: ${error.message}`);
            throw new common_1.InternalServerErrorException('Yevmiye kaydedilirken kritik bir altyapı hatası oluştu');
        }
    }
    async findAll(tenantId) {
        return this.prisma.journalEntry.findMany({
            where: { tenantId },
            orderBy: { entryDate: 'desc' },
            include: { lines: { include: { account: true } } }
        });
    }
    async findOne(id, tenantId) {
        const entry = await this.prisma.journalEntry.findFirst({
            where: { id, tenantId },
            include: { lines: { include: { account: true } } }
        });
        if (!entry)
            throw new common_1.NotFoundException('Yevmiye kaydı bulunamadı');
        return entry;
    }
    async setStatus(id, status, tenantId, userId) {
        const entry = await this.findOne(id, tenantId);
        if (entry.status === client_1.JournalStatus.CANCELLED) {
            throw new common_1.UnprocessableEntityException('İptal edilmiş kayıt değiştirilemez');
        }
        const updated = await this.prisma.journalEntry.update({
            where: { id },
            data: {
                status,
                postedAt: status === client_1.JournalStatus.POSTED && !entry.postedAt ? new Date() : entry.postedAt
            }
        });
        await this.auditLog.logEntityChange({
            tenantId,
            userId,
            action: client_1.AuditAction.UPDATE,
            entityType: 'journal_entry',
            entityId: entry.id,
            oldValues: { status: entry.status },
            newValues: { status: updated.status }
        });
        return updated;
    }
};
exports.JournalService = JournalService;
exports.JournalService = JournalService = JournalService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_log_service_1.AuditLogService])
], JournalService);
//# sourceMappingURL=journal.service.js.map