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
var InvoiceJournalListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceJournalListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const journal_service_1 = require("../../journal/journal.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let InvoiceJournalListener = InvoiceJournalListener_1 = class InvoiceJournalListener {
    constructor(journalService, prisma) {
        this.journalService = journalService;
        this.prisma = prisma;
        this.logger = new common_1.Logger(InvoiceJournalListener_1.name);
        this.accountCache = new Map();
    }
    async handleInvoicePostedEvent(payload) {
        const { invoice, tenantId, userId } = payload;
        this.logger.log(`[EVENT] Otomatik Yevmiye Kaydı tetiklendi - Fatura No: ${invoice.invoiceNumber}`);
        try {
            const lines = [];
            const totalAmount = Number(invoice.totalAmount);
            const subtotal = Number(invoice.subtotal);
            const taxAmount = Number(invoice.taxAmount);
            const withholding = Number(invoice.withholdingTotal);
            if (invoice.type === client_1.InvoiceType.SALES) {
                lines.push({
                    accountId: await this.getAccountId(tenantId, '120'),
                    debit: totalAmount,
                    credit: 0,
                    description: `Satış Faturası No: ${invoice.invoiceNumber}`,
                });
                if (withholding > 0) {
                    lines.push({
                        accountId: await this.getAccountId(tenantId, '136', true),
                        debit: withholding,
                        credit: 0,
                        description: 'KDV Tevkifatı Alacağı',
                    });
                }
                lines.push({
                    accountId: await this.getAccountId(tenantId, '600'),
                    debit: 0,
                    credit: subtotal,
                    description: 'Yurtiçi Satış Geliri',
                });
                const netTax = taxAmount - withholding;
                if (netTax > 0) {
                    lines.push({
                        accountId: await this.getAccountId(tenantId, '391'),
                        debit: 0,
                        credit: netTax,
                        description: 'Hesaplanan KDV',
                    });
                }
            }
            else if (invoice.type === client_1.InvoiceType.PURCHASE) {
                lines.push({
                    accountId: await this.getAccountId(tenantId, '153'),
                    debit: subtotal,
                    credit: 0,
                    description: `Alım Faturası: ${invoice.invoiceNumber}`,
                });
                if (taxAmount > 0) {
                    lines.push({
                        accountId: await this.getAccountId(tenantId, '191'),
                        debit: taxAmount,
                        credit: 0,
                        description: 'İndirilecek KDV',
                    });
                }
                lines.push({
                    accountId: await this.getAccountId(tenantId, '320'),
                    debit: 0,
                    credit: totalAmount,
                    description: 'Cari Borç Tahakkuku',
                });
            }
            const entryNumber = `OTOM-${Date.now().toString().slice(-5)}`;
            await this.journalService.postJournalEntry({
                entryNumber,
                entryDate: new Date(invoice.issueDate),
                description: `Tam Otomatik Entegrasyon: ${invoice.invoiceNumber} Nolu Fatura Mahsubu`,
                referenceType: client_1.JournalReferenceType.INVOICE,
                referenceId: invoice.id,
                status: client_1.JournalStatus.POSTED,
                lines,
            }, tenantId, userId);
            const journalEntry = await this.prisma.journalEntry.findFirst({ where: { tenantId, entryNumber } });
            if (journalEntry) {
                await this.prisma.invoice.update({
                    where: { id: invoice.id },
                    data: { journalEntryId: journalEntry.id },
                });
            }
            this.logger.log(`BAŞARILI: ${invoice.invoiceNumber} Nolu faturanın Yevmiyesi tescil edildi.`);
        }
        catch (error) {
            this.logger.error(`KRİTİK HATA: Otomatik Yevmiye Başarısız: ${error.message} - FATURA: ${invoice.invoiceNumber}`);
        }
    }
    async getAccountId(tenantId, code, autoCreate = false) {
        const cacheKey = `${tenantId}_${code}`;
        if (this.accountCache.has(cacheKey))
            return this.accountCache.get(cacheKey);
        let account = await this.prisma.account.findUnique({
            where: { tenantId_code: { tenantId, code } },
            select: { id: true },
        });
        if (!account && autoCreate) {
            account = await this.prisma.account.create({
                data: {
                    tenantId,
                    code,
                    name: 'Otomatik Oluşturulan Hesap',
                    type: 'ASSET',
                    normalBalance: 'DEBIT',
                    isSystem: false,
                },
            });
        }
        else if (!account) {
            throw new Error(`${code} nolu hesap planı sistemde bulunamadı. Lütfen hesap planını güncelleyiniz.`);
        }
        this.accountCache.set(cacheKey, account.id);
        return account.id;
    }
};
exports.InvoiceJournalListener = InvoiceJournalListener;
__decorate([
    (0, event_emitter_1.OnEvent)('invoice.posted', { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InvoiceJournalListener.prototype, "handleInvoicePostedEvent", null);
exports.InvoiceJournalListener = InvoiceJournalListener = InvoiceJournalListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [journal_service_1.JournalService,
        prisma_service_1.PrismaService])
], InvoiceJournalListener);
//# sourceMappingURL=invoice-journal.listener.js.map