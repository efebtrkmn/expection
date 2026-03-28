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
var AiApprovalService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiApprovalService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const journal_service_1 = require("../journal/journal.service");
const client_1 = require("@prisma/client");
let AiApprovalService = AiApprovalService_1 = class AiApprovalService {
    constructor(prisma, journalService) {
        this.prisma = prisma;
        this.journalService = journalService;
        this.logger = new common_1.Logger(AiApprovalService_1.name);
    }
    async getPendingQueue(tenantId) {
        return this.prisma.aiClassificationQueue.findMany({
            where: { tenantId, status: client_1.AiClassificationStatus.PENDING_REVIEW },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getQueue(tenantId, status) {
        return this.prisma.aiClassificationQueue.findMany({
            where: { tenantId, ...(status ? { status } : {}) },
            orderBy: { createdAt: 'desc' },
        });
    }
    async approve(queueId, tenantId, userId, dto) {
        const entry = await this.findEntry(queueId, tenantId);
        this.assertPending(entry);
        const targetAccount = await this.prisma.account.findFirst({
            where: { tenantId, code: { startsWith: dto.accountCode.substring(0, 3) }, isActive: true },
        });
        if (!targetAccount) {
            throw new common_1.BadRequestException(`"${dto.accountCode}" kodu ile eşleşen aktif hesap bulunamadı`);
        }
        const cashAccount = await this.prisma.account.findFirst({
            where: { tenantId, code: { startsWith: '100' }, isActive: true },
        });
        if (!cashAccount)
            throw new common_1.BadRequestException('Kasa hesabı (100) bulunamadı');
        const journalEntry = await this.journalService.postJournalEntry({
            entryNumber: `AI-M-${Date.now()}`,
            entryDate: new Date().toISOString(),
            description: `AI İnsan Onayı: ${entry.inputText.substring(0, 100)}`,
            referenceType: client_1.JournalReferenceType.MANUAL,
            referenceId: entry.referenceId || undefined,
            lines: [
                { accountId: targetAccount.id, debit: 0, credit: 100, description: entry.inputText.substring(0, 200) },
                { accountId: cashAccount.id, debit: 100, credit: 0, description: 'İnsan onaylı AI sınıflandırma' },
            ],
        }, tenantId, userId);
        await this.prisma.aiClassificationQueue.update({
            where: { id: queueId },
            data: {
                status: client_1.AiClassificationStatus.HUMAN_APPROVED,
                suggestedAccountCode: dto.accountCode,
                suggestedAccountId: targetAccount.id,
                journalEntryId: journalEntry.id,
                reviewedByUserId: userId,
                reviewNote: dto.note,
                reviewedAt: new Date(),
            },
        });
        const wasCorrect = entry.suggestedAccountCode?.startsWith(dto.accountCode.substring(0, 3));
        this.logger.log(`AI kuyruk onaylandı: ${entry.suggestedAccountCode} → ${dto.accountCode} (Düzeltildi: ${!wasCorrect})`);
        return {
            approved: true,
            accountCode: dto.accountCode,
            accountName: targetAccount.name,
            journalEntryId: journalEntry.id,
            aiWasCorrect: wasCorrect,
        };
    }
    async reject(queueId, tenantId, userId, dto) {
        const entry = await this.findEntry(queueId, tenantId);
        this.assertPending(entry);
        await this.prisma.aiClassificationQueue.update({
            where: { id: queueId },
            data: {
                status: client_1.AiClassificationStatus.REJECTED,
                reviewedByUserId: userId,
                reviewNote: dto.note,
                reviewedAt: new Date(),
            },
        });
        this.logger.log(`AI kuyruk reddedildi: ${queueId}`);
        return { rejected: true, note: dto.note };
    }
    async findEntry(queueId, tenantId) {
        const entry = await this.prisma.aiClassificationQueue.findFirst({
            where: { id: queueId, tenantId },
        });
        if (!entry)
            throw new common_1.NotFoundException('AI kuyruk kaydı bulunamadı');
        return entry;
    }
    assertPending(entry) {
        if (entry.status !== client_1.AiClassificationStatus.PENDING_REVIEW) {
            throw new common_1.BadRequestException(`Bu kayıt zaten işlenmiş: ${entry.status}`);
        }
    }
};
exports.AiApprovalService = AiApprovalService;
exports.AiApprovalService = AiApprovalService = AiApprovalService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        journal_service_1.JournalService])
], AiApprovalService);
//# sourceMappingURL=ai-approval.service.js.map