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
var IyzicoCallbackService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IyzicoCallbackService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const mail_service_1 = require("../../mail/mail.service");
const journal_service_1 = require("../../journal/journal.service");
const iyzico_signature_util_1 = require("./iyzico-signature.util");
const event_emitter_1 = require("@nestjs/event-emitter");
const client_1 = require("@prisma/client");
const crypto = require("crypto");
const decimal_js_1 = require("decimal.js");
let IyzicoCallbackService = IyzicoCallbackService_1 = class IyzicoCallbackService {
    constructor(prisma, httpService, config, mailService, journalService, eventEmitter) {
        this.prisma = prisma;
        this.httpService = httpService;
        this.config = config;
        this.mailService = mailService;
        this.journalService = journalService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(IyzicoCallbackService_1.name);
    }
    async handleCallback(payload, iyzicoSignature) {
        const token = payload.token;
        const status = payload.status;
        const conversationId = payload.conversationId || payload.conversation_id;
        this.logger.log(`Iyzico Callback alındı: ${conversationId} — ${status}`);
        if (iyzicoSignature) {
            const session = await this.prisma.paymentSession.findUnique({ where: { conversationId } });
            if (session) {
                const iyzicoSettings = await this.prisma.iyzicoSettings.findUnique({ where: { tenantId: session.tenantId } });
                if (iyzicoSettings) {
                    const secretKey = this.decrypt(iyzicoSettings.secretKeyEncrypted);
                    const valid = iyzico_signature_util_1.IyzicoSignatureUtil.verifyCallbackSignature(token, secretKey, iyzicoSignature);
                    if (!valid) {
                        this.logger.error('Iyzico callback imzası geçersiz!');
                        throw new common_1.UnauthorizedException('Geçersiz Iyzico imzası');
                    }
                }
            }
        }
        const session = await this.prisma.paymentSession.findUnique({ where: { conversationId } });
        if (!session) {
            this.logger.warn(`Bilinmeyen conversationId: ${conversationId}`);
            return { received: true };
        }
        if (session.status !== client_1.PaymentSessionStatus.PENDING) {
            this.logger.warn(`Zaten işlenmiş callback: ${conversationId}`);
            return { received: true };
        }
        if (status === 'success') {
            await this.handleSuccessfulPayment(session, payload);
        }
        else {
            await this.handleFailedPayment(session, payload);
        }
        return { received: true };
    }
    async handleSuccessfulPayment(session, payload) {
        const { tenantId, invoiceId, customerSupplierId, amount } = session;
        await this.prisma.paymentSession.update({
            where: { id: session.id },
            data: {
                status: client_1.PaymentSessionStatus.SUCCESS,
                paidAt: new Date(),
                callbackPayload: payload,
            },
        });
        const invoice = await this.prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                status: client_1.InvoiceStatus.PAID,
            },
            include: { customerSupplier: true },
        });
        await this.createCollectionJournalEntry(tenantId, invoice, amount);
        const customerEmail = invoice.customerSupplier?.email;
        if (customerEmail) {
            await this.mailService.sendPaymentConfirmation(customerEmail, {
                customerName: invoice.customerSupplier.name,
                invoiceNumber: invoice.invoiceNumber,
                amount: Number(amount),
                currency: invoice.currency || 'TRY',
                paidAt: new Date(),
            });
        }
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (tenant?.email) {
            await this.mailService.sendAdminPaymentAlert(tenant.email, {
                customerName: invoice.customerSupplier.name,
                invoiceNumber: invoice.invoiceNumber,
                amount: Number(amount),
            });
        }
        this.eventEmitter.emit('payment.success', {
            tenantId,
            invoiceId,
            amount: Number(amount),
            invoiceNumber: invoice.invoiceNumber,
            customerName: invoice.customerSupplier.name,
        });
        this.logger.log(`✅ Ödeme başarılı: Fatura ${invoice.invoiceNumber} → PAID`);
    }
    async handleFailedPayment(session, payload) {
        await this.prisma.paymentSession.update({
            where: { id: session.id },
            data: {
                status: client_1.PaymentSessionStatus.FAILED,
                callbackPayload: payload,
            },
        });
        this.logger.warn(`❌ Ödeme başarısız: ${session.invoiceId} — ${payload.errorMessage || 'Bilinmeyen hata'}`);
    }
    async createCollectionJournalEntry(tenantId, invoice, amount) {
        try {
            const debitAccount = await this.prisma.account.findFirst({
                where: { tenantId, code: { startsWith: '102' }, isActive: true },
            }) || await this.prisma.account.findFirst({
                where: { tenantId, code: { startsWith: '100' }, isActive: true },
            });
            const creditAccount = await this.prisma.account.findFirst({
                where: { tenantId, code: { startsWith: '120' }, isActive: true },
            });
            if (!debitAccount || !creditAccount) {
                this.logger.warn('Tahsilat yevmiyesi: Hesap planı bulunamadı, yevmiye oluşturulamadı');
                return;
            }
            const amountDecimal = new decimal_js_1.Decimal(amount.toString());
            await this.journalService.postJournalEntry({
                entryNumber: `IYZ-${Date.now()}`,
                entryDate: new Date().toISOString(),
                description: `Iyzico Tahsilat — ${invoice.invoiceNumber}`,
                referenceType: 'PAYMENT',
                referenceId: invoice.id,
                lines: [
                    { accountId: debitAccount.id, debit: amountDecimal.toNumber(), credit: 0, description: 'Kredi karti tahsilati' },
                    { accountId: creditAccount.id, debit: 0, credit: amountDecimal.toNumber(), description: `Fatura ${invoice.invoiceNumber} tahsilat kapatma` },
                ],
            }, tenantId, invoice.createdById);
            this.logger.log(`Tahsilat yevmiyesi oluşturuldu: DR ${debitAccount.code} / CR ${creditAccount.code}`);
        }
        catch (err) {
            this.logger.error(`Tahsilat yevmiyesi hatası: ${err.message}`);
        }
    }
    decrypt(encrypted) {
        try {
            const encKey = this.config.get('APP_ENCRYPTION_KEY', 'default-32-char-key-for-dev-only!');
            const key = Buffer.from(encKey.padEnd(32).slice(0, 32));
            const [ivHex, encHex] = encrypted.split(':');
            if (!ivHex || !encHex)
                return encrypted;
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
            return decipher.update(encHex, 'hex', 'utf-8') + decipher.final('utf-8');
        }
        catch {
            return encrypted;
        }
    }
};
exports.IyzicoCallbackService = IyzicoCallbackService;
exports.IyzicoCallbackService = IyzicoCallbackService = IyzicoCallbackService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        axios_1.HttpService,
        config_1.ConfigService,
        mail_service_1.MailService,
        journal_service_1.JournalService,
        event_emitter_1.EventEmitter2])
], IyzicoCallbackService);
//# sourceMappingURL=iyzico-callback.service.js.map