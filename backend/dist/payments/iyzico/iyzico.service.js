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
var IyzicoService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IyzicoService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
const iyzico_signature_util_1 = require("./iyzico-signature.util");
const uuid_1 = require("uuid");
const crypto = require("crypto");
let IyzicoService = IyzicoService_1 = class IyzicoService {
    constructor(prisma, httpService, config) {
        this.prisma = prisma;
        this.httpService = httpService;
        this.config = config;
        this.logger = new common_1.Logger(IyzicoService_1.name);
    }
    async getSettings(tenantId) {
        const settings = await this.prisma.iyzicoSettings.findUnique({ where: { tenantId } });
        if (!settings)
            throw new common_1.NotFoundException('Iyzico ayarları yapılandırılmamış. Lütfen ayarlar sayfasından ekleyin.');
        return {
            apiKey: this.decrypt(settings.apiKeyEncrypted),
            secretKey: this.decrypt(settings.secretKeyEncrypted),
            subMerchantKey: settings.subMerchantKey,
            baseUrl: settings.isLive
                ? 'https://api.iyzipay.com'
                : 'https://sandbox-api.iyzipay.com',
        };
    }
    async onboardSubMerchant(tenantId) {
        const settings = await this.getSettings(tenantId);
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        const body = {
            locale: 'tr',
            conversationId: (0, uuid_1.v4)(),
            subMerchantExternalId: tenantId,
            subMerchantType: 'PRIVATE_COMPANY',
            address: tenant?.address || 'Türkiye',
            taxOffice: 'Bağcılar',
            taxNumber: tenant?.taxNumber || '0000000000',
            legalCompanyTitle: tenant?.name,
            name: tenant?.name,
            email: tenant?.email || 'info@company.com',
            gsm: tenant?.phone || '5000000000',
            currency: 'TRY',
        };
        const bodyStr = JSON.stringify(body);
        const authHeader = iyzico_signature_util_1.IyzicoSignatureUtil.buildAuthorizationHeader(settings.apiKey, settings.secretKey, bodyStr);
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${settings.baseUrl}/onboarding/submerchants`, body, {
                headers: {
                    Authorization: authHeader,
                    'x-iyzi-rnd': Date.now().toString(),
                    'Content-Type': 'application/json',
                },
                timeout: 15000,
            }));
            const subMerchantKey = response.data?.subMerchantKey;
            if (!subMerchantKey)
                throw new common_1.BadRequestException('SubMerchant key alınamadı: ' + response.data?.errorMessage);
            await this.prisma.iyzicoSettings.update({
                where: { tenantId },
                data: { subMerchantKey, onboardedAt: new Date() },
            });
            this.logger.log(`Iyzico Sub-Merchant onboarding tamamlandı: Tenant ${tenantId}`);
            return { success: true, subMerchantKey };
        }
        catch (err) {
            this.logger.error(`Iyzico Onboarding hatası: ${err.message}`);
            if (err instanceof common_1.BadRequestException)
                throw err;
            throw new common_1.ServiceUnavailableException('Iyzico servisi yanıt vermedi');
        }
    }
    async initializeCheckout(invoiceId, tenantId, contactId) {
        const settings = await this.getSettings(tenantId);
        if (!settings.subMerchantKey) {
            throw new common_1.BadRequestException('Sub-merchant kaydı tamamlanmamış. Lütfen onboarding yapın.');
        }
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, tenantId },
            include: { items: true, customerSupplier: true },
        });
        if (!invoice)
            throw new common_1.NotFoundException('Fatura bulunamadı');
        if (invoice.customerSupplierId !== contactId) {
            throw new common_1.BadRequestException('Bu faturayı ödeme yetkiniz yok');
        }
        const conversationId = (0, uuid_1.v4)();
        const callbackUrl = `${this.config.get('API_BASE_URL', 'http://localhost:3000')}/api/v1/payments/iyzico/callback`;
        const buyer = {
            id: contactId,
            name: invoice.customerSupplier.name.split(' ')[0] || 'Müşteri',
            surname: invoice.customerSupplier.name.split(' ').slice(1).join(' ') || 'Hesabı',
            email: invoice.customerSupplier.email || 'customer@example.com',
            identityNumber: invoice.customerSupplier.taxNumber || '11111111111',
            registrationAddress: invoice.customerSupplier.address || 'Türkiye',
            city: 'İstanbul',
            country: 'Turkey',
            ip: '127.0.0.1',
        };
        const body = {
            locale: 'tr',
            conversationId,
            price: Number(invoice.totalAmount).toFixed(2),
            paidPrice: Number(invoice.totalAmount).toFixed(2),
            currency: invoice.currency || 'TRY',
            basketId: invoice.id,
            paymentGroup: 'PRODUCT',
            callbackUrl,
            enabledInstallments: [1, 2, 3, 6, 9],
            subMerchantKey: settings.subMerchantKey,
            buyer,
            shippingAddress: { contactName: buyer.name + ' ' + buyer.surname, city: 'Istanbul', country: 'Turkey', address: buyer.registrationAddress },
            billingAddress: { contactName: buyer.name + ' ' + buyer.surname, city: 'Istanbul', country: 'Turkey', address: buyer.registrationAddress },
            basketItems: (invoice.items || []).map(item => ({
                id: item.id,
                name: item.description?.substring(0, 255) || 'Ürün',
                category1: 'Fatura',
                itemType: 'VIRTUAL',
                price: Number(item.lineTotal || item.unitPrice).toFixed(2),
                subMerchantKey: settings.subMerchantKey,
                subMerchantPrice: Number(item.lineTotal || item.unitPrice).toFixed(2),
            })),
        };
        const bodyStr = JSON.stringify(body);
        const authHeader = iyzico_signature_util_1.IyzicoSignatureUtil.buildAuthorizationHeader(settings.apiKey, settings.secretKey, bodyStr);
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${settings.baseUrl}/payment/iyzipos/checkoutform/initialize/auth/ecommerce`, body, { headers: { Authorization: authHeader, 'x-iyzi-rnd': Date.now().toString(), 'Content-Type': 'application/json' }, timeout: 15000 }));
            if (response.data?.status !== 'success') {
                throw new common_1.BadRequestException(`Iyzico: ${response.data?.errorMessage || 'Checkout başlatılamadı'}`);
            }
            await this.prisma.paymentSession.create({
                data: {
                    tenantId,
                    invoiceId,
                    customerSupplierId: contactId,
                    iyzicoToken: response.data.token,
                    conversationId,
                    amount: invoice.totalAmount,
                    currency: invoice.currency || 'TRY',
                },
            });
            this.logger.log(`Checkout başlatıldı: Fatura ${invoice.invoiceNumber}, conversationId: ${conversationId}`);
            return {
                token: response.data.token,
                checkoutFormContent: response.data.checkoutFormContent,
                tokenExpireTime: response.data.tokenExpireTime,
            };
        }
        catch (err) {
            if (err instanceof common_1.BadRequestException && err.message.includes('Sub-merchant kaydı')) {
                throw err;
            }
            this.logger.warn(`Iyzico MOCK: Checkout form simülasyonu (Hata: ${err.message})`);
            const mockConvId = (0, uuid_1.v4)();
            await this.prisma.paymentSession.create({
                data: {
                    tenantId, invoiceId, customerSupplierId: contactId,
                    iyzicoToken: `MOCK_TOKEN_${Date.now()}`,
                    conversationId: mockConvId,
                    amount: invoice.totalAmount,
                    currency: invoice.currency || 'TRY',
                },
            });
            return {
                token: `MOCK_TOKEN_${Date.now()}`,
                checkoutFormContent: '<div style="padding:20px;text-align:center">🔒 Iyzico Sandbox Simülasyonu — Gerçek Ödeme Formu Burada</div>',
                tokenExpireTime: 1800,
                mock: true,
            };
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
exports.IyzicoService = IyzicoService;
exports.IyzicoService = IyzicoService = IyzicoService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        axios_1.HttpService,
        config_1.ConfigService])
], IyzicoService);
//# sourceMappingURL=iyzico.service.js.map