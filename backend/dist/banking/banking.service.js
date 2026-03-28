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
exports.BankingService = exports.CreateBankAccountDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bank_sync_service_1 = require("./bank-sync.service");
class CreateBankAccountDto {
}
exports.CreateBankAccountDto = CreateBankAccountDto;
let BankingService = class BankingService {
    constructor(prisma, syncService) {
        this.prisma = prisma;
        this.syncService = syncService;
    }
    async create(tenantId, dto) {
        const existing = await this.prisma.bankAccount.findFirst({
            where: { tenantId, iban: dto.iban },
        });
        if (existing)
            throw new common_1.ConflictException('Bu IBAN zaten sistemde kayıtlı');
        return this.prisma.bankAccount.create({
            data: { ...dto, tenantId, currency: dto.currency || 'TRY' },
        });
    }
    async findAll(tenantId) {
        return this.prisma.bankAccount.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getTransactions(bankAccountId, tenantId) {
        const account = await this.prisma.bankAccount.findFirst({
            where: { id: bankAccountId, tenantId },
        });
        if (!account)
            throw new common_1.NotFoundException('Banka hesabı bulunamadı');
        return this.prisma.bankTransaction.findMany({
            where: { bankAccountId },
            orderBy: { transactionDate: 'desc' },
        });
    }
    async manualSync(bankAccountId, tenantId) {
        const account = await this.prisma.bankAccount.findFirst({
            where: { id: bankAccountId, tenantId },
        });
        if (!account)
            throw new common_1.NotFoundException('Banka hesabı bulunamadı');
        return this.syncService.syncAccount(bankAccountId, tenantId, account.providerAccountId);
    }
};
exports.BankingService = BankingService;
exports.BankingService = BankingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        bank_sync_service_1.BankSyncService])
], BankingService);
//# sourceMappingURL=banking.service.js.map