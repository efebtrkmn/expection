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
var HepsiburadaAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HepsiburadaAdapter = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let HepsiburadaAdapter = HepsiburadaAdapter_1 = class HepsiburadaAdapter {
    constructor(httpService, merchantId, apiKey) {
        this.httpService = httpService;
        this.merchantId = merchantId;
        this.apiKey = apiKey;
        this.logger = new common_1.Logger(HepsiburadaAdapter_1.name);
        this.orderBaseUrl = 'https://mpop.hepsiburada.com/order/api';
    }
    async getOrders(since) {
        const beginDate = since
            ? since.toISOString().split('T')[0]
            : new Date(Date.now() - 86400000).toISOString().split('T')[0];
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.orderBaseUrl}/orders/merchantid/${this.merchantId}`, {
                params: { beginDate, offset: 0, limit: 200 },
                auth: { username: this.merchantId, password: this.apiKey },
                timeout: 15000,
            }));
            const orders = response.data?.items || response.data || [];
            return orders.map((o) => this.mapHepsiburadaOrder(o));
        }
        catch (err) {
            this.logger.error(`Hepsiburada API hatası: ${err.message}`);
            return this.getMockOrders();
        }
    }
    async getOrderDetail(orderId) {
        const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.orderBaseUrl}/orders/${orderId}/merchantid/${this.merchantId}`, { auth: { username: this.merchantId, password: this.apiKey }, timeout: 10000 }));
        return this.mapHepsiburadaOrder(response.data);
    }
    mapHepsiburadaOrder(order) {
        return {
            orderId: String(order.orderNumber || order.id),
            marketplace: 'HEPSIBURADA',
            status: order.status || 'WAITING_IN_PACKAGE',
            customerName: order.customerName || order.customer?.fullName,
            customerEmail: order.customerEmail,
            totalAmount: Number(order.totalPrice || order.total || 0),
            currency: 'TRY',
            orderedAt: new Date(order.orderDate || order.createdDate || Date.now()),
            lines: (order.lineItems || order.lines || []).map((l) => ({
                productCode: l.sku || l.productSku,
                productName: l.productName,
                quantity: l.quantity || 1,
                unitPrice: l.unitPrice || l.price,
                taxRate: 20,
                currency: 'TRY',
            })),
            rawPayload: order,
        };
    }
    getMockOrders() {
        return [{
                orderId: `MOCK-HB-${Date.now()}`,
                marketplace: 'HEPSIBURADA',
                status: 'WAITING_IN_PACKAGE',
                customerName: 'Hepsi Test Müşteri',
                customerEmail: 'hbtest@example.com',
                totalAmount: 599,
                currency: 'TRY',
                orderedAt: new Date(),
                lines: [{ productName: 'Hepsi Test Ürün', quantity: 1, unitPrice: 499.17, taxRate: 20, currency: 'TRY' }],
                rawPayload: { mock: true },
            }];
    }
};
exports.HepsiburadaAdapter = HepsiburadaAdapter;
exports.HepsiburadaAdapter = HepsiburadaAdapter = HepsiburadaAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService, String, String])
], HepsiburadaAdapter);
//# sourceMappingURL=hepsiburada.adapter.js.map