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
var IntegratorClientService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegratorClientService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
let IntegratorClientService = IntegratorClientService_1 = class IntegratorClientService {
    constructor(httpService, config) {
        this.httpService = httpService;
        this.config = config;
        this.logger = new common_1.Logger(IntegratorClientService_1.name);
        this.isSandbox = config.get('INTEGRATOR_ENV', 'sandbox') === 'sandbox';
        this.baseUrl = this.isSandbox
            ? 'https://efatura-test.uyumsoft.com.tr/api/v1'
            : config.get('INTEGRATOR_BASE_URL', 'https://efatura.uyumsoft.com.tr/api/v1');
        this.username = config.get('INTEGRATOR_USERNAME', '');
        this.password = config.get('INTEGRATOR_PASSWORD', '');
    }
    async sendInvoice(xmlContent, invoiceUuid, invoiceNumber) {
        const base64Xml = Buffer.from(xmlContent, 'utf-8').toString('base64');
        const payload = {
            invoiceUUID: invoiceUuid,
            invoiceNumber: invoiceNumber,
            invoiceContent: base64Xml,
            invoiceType: 'EARSIV',
        };
        try {
            this.logger.log(`[${this.isSandbox ? 'SANDBOX' : 'PROD'}] Entegratöre fatura gönderiliyor: ${invoiceNumber}`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.baseUrl}/invoices/send`, payload, {
                auth: { username: this.username, password: this.password },
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                timeout: 30000,
            }));
            this.logger.log(`Entegratör yanıtı: ${JSON.stringify(response.data)}`);
            return {
                success: true,
                gibUuid: response.data?.uuid || invoiceUuid,
                referenceId: response.data?.referenceId,
                status: 'PENDING',
                rawResponse: response.data,
            };
        }
        catch (error) {
            const axiosErr = error;
            const errMsg = axiosErr.response?.data?.message || axiosErr.message;
            this.logger.error(`Entegratör hatası: ${errMsg}`);
            if (this.isSandbox && !this.username) {
                this.logger.warn('SANDBOX MOCK: Gerçek entegratör bilgileri yok, mock yanıt döndürülüyor.');
                return {
                    success: true,
                    gibUuid: invoiceUuid,
                    referenceId: `MOCK-${Date.now()}`,
                    status: 'PENDING',
                    message: 'Mock: Sandbox credentials ayarlanmamış',
                };
            }
            throw new common_1.ServiceUnavailableException(`Entegratör servisi yanıt vermedi: ${errMsg}`);
        }
    }
    async queryStatus(gibUuid) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}/invoices/${gibUuid}/status`, {
                auth: { username: this.username, password: this.password },
                timeout: 15000,
            }));
            return {
                gibUuid,
                status: response.data?.status || 'PENDING',
                gibCode: response.data?.gibCode,
                gibMessage: response.data?.gibMessage,
            };
        }
        catch {
            return { gibUuid, status: 'IN_PROGRESS', gibMessage: 'Mock: Durum sorgulama simülasyonu' };
        }
    }
};
exports.IntegratorClientService = IntegratorClientService;
exports.IntegratorClientService = IntegratorClientService = IntegratorClientService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], IntegratorClientService);
//# sourceMappingURL=integrator-client.service.js.map