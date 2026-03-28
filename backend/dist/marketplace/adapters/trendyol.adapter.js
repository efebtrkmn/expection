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
var TrendyolAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrendyolAdapter = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let TrendyolAdapter = TrendyolAdapter_1 = class TrendyolAdapter {
    constructor(httpService, supplierId, apiKey, apiSecret) {
        this.httpService = httpService;
        this.supplierId = supplierId;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.logger = new common_1.Logger(TrendyolAdapter_1.name);
        this.baseUrl = 'https://api.trendyol.com/sapigw';
    }
    async getOrders(since) {
        const startDate = since ? since.getTime() : Date.now() - 24 * 60 * 60 * 1000;
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}/suppliers/${this.supplierId}/orders`, {
                params: {
                    startDate: Math.floor(startDate),
                    endDate: Date.now(),
                    size: 200,
                    page: 0,
                    status: 'Created',
                },
                auth: { username: this.apiKey, password: this.apiSecret },
                headers: { 'User-Agent': `${this.supplierId} - Expection SaaS` },
                timeout: 15000,
            }));
            const orders = response.data?.content || [];
            return orders.map((o) => this.mapTrendyolOrder(o));
        }
        catch (err) {
            this.logger.error(`Trendyol API hatası: ${err.message}`);
            return this.getMockOrders();
        }
    }
    async getOrderDetail(orderId) {
        const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}/suppliers/${this.supplierId}/orders/${orderId}`, {
            auth: { username: this.apiKey, password: this.apiSecret },
            timeout: 10000,
        }));
        return this.mapTrendyolOrder(response.data);
    }
    mapTrendyolOrder(order) {
        return {
            orderId: String(order.orderNumber || order.id),
            marketplace: 'TRENDYOL',
            status: order.status || 'Created',
            customerName: `${order.shipmentAddress?.firstName || ''} ${order.shipmentAddress?.lastName || ''}`.trim(),
            customerEmail: order.customerEmail,
            totalAmount: Number(order.totalPrice || 0),
            currency: 'TRY',
            orderedAt: new Date(order.orderDate || Date.now()),
            lines: (order.lines || []).map((l) => ({
                productCode: l.barcode,
                productName: l.productName,
                quantity: l.quantity,
                unitPrice: l.price,
                taxRate: l.vatBaseAmountStr ? 20 : 20,
                currency: 'TRY',
            })),
            rawPayload: order,
        };
    }
    getMockOrders() {
        return [{
                orderId: `MOCK-TY-${Date.now()}`,
                marketplace: 'TRENDYOL',
                status: 'Created',
                customerName: 'Test Müşteri',
                customerEmail: 'test@example.com',
                totalAmount: 1180,
                currency: 'TRY',
                orderedAt: new Date(),
                lines: [{ productName: 'Test Ürün', quantity: 1, unitPrice: 1000, taxRate: 20, currency: 'TRY' }],
                rawPayload: { mock: true },
            }];
    }
};
exports.TrendyolAdapter = TrendyolAdapter;
exports.TrendyolAdapter = TrendyolAdapter = TrendyolAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService, String, String, String])
], TrendyolAdapter);
//# sourceMappingURL=trendyol.adapter.js.map