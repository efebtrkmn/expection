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
var BankSyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankSyncService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const mt940_parser_service_1 = require("./mt940-parser.service");
const rxjs_1 = require("rxjs");
let BankSyncService = BankSyncService_1 = class BankSyncService {
    constructor(prisma, httpService, config, mt940Parser) {
        this.prisma = prisma;
        this.httpService = httpService;
        this.config = config;
        this.mt940Parser = mt940Parser;
        this.logger = new common_1.Logger(BankSyncService_1.name);
        this.kolayBiBaseUrl = config.get('KOLAYBI_BASE_URL', 'https://api.kolaybi.com/v1');
        this.kolayBiToken = config.get('KOLAYBI_API_TOKEN', '');
        this.isMock = !this.kolayBiToken;
    }
    async scheduledSync() {
        this.logger.log('[CRON] Banka senkronizasyonu başlatılıyor...');
        const accounts = await this.prisma.bankAccount.findMany({
            where: { isActive: true, provider: 'KOLAYBI' },
        });
        this.logger.log(`${accounts.length} aktif KolayBi banka hesabı bulundu`);
        for (const account of accounts) {
            try {
                await this.syncAccount(account.id, account.tenantId, account.providerAccountId);
            }
            catch (err) {
                this.logger.error(`Hesap senkronizasyonu başarısız: ${account.iban} — ${err.message}`);
            }
        }
    }
    async syncAccount(bankAccountId, tenantId, providerAccountId) {
        this.logger.log(`Hesap senkronize ediliyor: ${bankAccountId}`);
        let mt940Content;
        if (this.isMock) {
            mt940Content = this.getMockMt940();
        }
        else {
            mt940Content = await this.fetchFromKolayBi(providerAccountId || bankAccountId);
        }
        const statement = this.mt940Parser.parse(mt940Content);
        let newTxCount = 0;
        for (const tx of statement.transactions) {
            const existing = await this.prisma.bankTransaction.findFirst({
                where: {
                    bankAccountId,
                    referenceNumber: tx.reference,
                    transactionDate: tx.date,
                },
            });
            if (existing)
                continue;
            await this.prisma.bankTransaction.create({
                data: {
                    tenantId,
                    bankAccountId,
                    transactionDate: tx.date,
                    valueDate: tx.valueDate,
                    amount: tx.amount.toNumber(),
                    currency: tx.currency,
                    description: tx.description,
                    referenceNumber: tx.reference,
                    type: tx.type,
                    mt940Raw: tx.rawLine,
                },
            });
            newTxCount++;
        }
        await this.prisma.bankAccount.update({
            where: { id: bankAccountId },
            data: { lastSyncedAt: new Date() },
        });
        this.logger.log(`Senkronizasyon tamamlandı: ${newTxCount} yeni hareket kaydedildi`);
        return { synced: newTxCount, total: statement.transactions.length };
    }
    async fetchFromKolayBi(accountId) {
        const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.kolayBiBaseUrl}/bank-accounts/${accountId}/mt940`, {
            headers: { Authorization: `Bearer ${this.kolayBiToken}` },
            timeout: 20000,
        }));
        return response.data?.mt940Content || response.data;
    }
    getMockMt940() {
        return [
            ':20:EXPECTION-TEST',
            ':25:TR12 0006 2000 1050 0000 0000 26',
            ':28C:1/1',
            ':60F:C240328TRY100000,00',
            ':61:240328C5900,00NTRFEXP-INV-001',
            ':86:EXPECTION INV-001 Nolu Fatura Tahsilatı',
            ':61:240328D1180,00NTRFKIRA-2024-03',
            ':86:Mart Kirası Ödemesi',
            ':62F:C240328TRY104720,00',
        ].join('\n');
    }
};
exports.BankSyncService = BankSyncService;
__decorate([
    (0, schedule_1.Cron)('0 */4 * * *', { name: 'bank_sync_job', timeZone: 'Europe/Istanbul' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BankSyncService.prototype, "scheduledSync", null);
exports.BankSyncService = BankSyncService = BankSyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        axios_1.HttpService,
        config_1.ConfigService,
        mt940_parser_service_1.Mt940ParserService])
], BankSyncService);
//# sourceMappingURL=bank-sync.service.js.map