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
const schedule_1 = require("@nestjs/schedule");
const client_1 = require("@prisma/client");
let ReconciliationService = ReconciliationService_1 = class ReconciliationService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(ReconciliationService_1.name);
    }
    async scheduledReconciliation() {
        this.logger.log('[CRON] Mutabakat işlemi başlatılıyor...');
        const unmatched = await this.prisma.bankTransaction.findMany({
            where: { isReconciled: false, type: 'CREDIT' },
        });
        this.logger.log(`${unmatched.length} eşleşmemiş alacak hareketi bulundu`);
        let matchedCount = 0;
        for (const tx of unmatched) {
            try {
                const matched = await this.tryMatch(tx);
                if (matched)
                    matchedCount++;
            }
            catch (err) {
                this.logger.warn(`Eşleştirme hatası txId=${tx.id}: ${err.message}`);
            }
        }
        this.logger.log(`Mutabakat tamamlandı: ${matchedCount}/${unmatched.length} eşleştirildi`);
    }
    async manualMatch(txId, invoiceId, tenantId) {
        const [tx, invoice] = await Promise.all([
            this.prisma.bankTransaction.findFirst({ where: { id: txId, tenantId } }),
            this.prisma.invoice.findFirst({ where: { id: invoiceId, tenantId } }),
        ]);
        if (!tx || !invoice)
            throw new Error('Hareket veya fatura bulunamadı');
        await Promise.all([
            this.prisma.bankTransaction.update({
                where: { id: txId },
                data: { isReconciled: true, matchedInvoiceId: invoiceId },
            }),
            this.prisma.invoice.update({
                where: { id: invoiceId },
                data: { status: client_1.InvoiceStatus.PAID },
            }),
        ]);
        return { matched: true, invoiceId, txId };
    }
    async getUnmatchedTransactions(tenantId) {
        return this.prisma.bankTransaction.findMany({
            where: { tenantId, isReconciled: false },
            orderBy: { transactionDate: 'desc' },
        });
    }
    async tryMatch(tx) {
        if (!tx.description && !tx.referenceNumber)
            return false;
        const searchText = `${tx.description || ''} ${tx.referenceNumber || ''}`.toUpperCase();
        const invoiceNumberMatch = searchText.match(/INV[-‑]?\d+|FAT[-‑]?\d+|[A-Z]{2,5}\d{4}\d+/);
        if (!invoiceNumberMatch)
            return false;
        const potentialInvoiceNumber = invoiceNumberMatch[0];
        const invoice = await this.prisma.invoice.findFirst({
            where: {
                tenantId: tx.tenantId,
                invoiceNumber: { contains: potentialInvoiceNumber, mode: 'insensitive' },
                status: { in: [client_1.InvoiceStatus.ISSUED, client_1.InvoiceStatus.SENT, client_1.InvoiceStatus.OVERDUE] },
            },
        });
        if (!invoice)
            return false;
        const amountDiff = Math.abs(Number(tx.amount) - Number(invoice.totalAmount));
        if (amountDiff > 10)
            return false;
        await this.manualMatch(tx.id, invoice.id, tx.tenantId);
        this.logger.log(`Eşleştirildi: BankTx ${tx.referenceNumber} ↔ Fatura ${invoice.invoiceNumber}`);
        return true;
    }
};
exports.ReconciliationService = ReconciliationService;
__decorate([
    (0, schedule_1.Cron)('0 2 * * *', { name: 'reconciliation_job', timeZone: 'Europe/Istanbul' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReconciliationService.prototype, "scheduledReconciliation", null);
exports.ReconciliationService = ReconciliationService = ReconciliationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReconciliationService);
//# sourceMappingURL=reconciliation.service.js.map