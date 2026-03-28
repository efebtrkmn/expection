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
var AmazonAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmazonAdapter = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let AmazonAdapter = AmazonAdapter_1 = class AmazonAdapter {
    constructor(httpService, sellerId, lwaClientId, lwaClientSecret, lwaRefreshToken) {
        this.httpService = httpService;
        this.sellerId = sellerId;
        this.lwaClientId = lwaClientId;
        this.lwaClientSecret = lwaClientSecret;
        this.lwaRefreshToken = lwaRefreshToken;
        this.logger = new common_1.Logger(AmazonAdapter_1.name);
        this.MARKETPLACE_ID = 'A33AVAJ2PDY3EV';
        this.SP_API_BASE = 'https://sellingpartnerapi-eu.amazon.com';
        this.LWA_URL = 'https://api.amazon.com/auth/o2/token';
        this.cachedToken = null;
        this.tokenExpiry = 0;
    }
    async getOrders(since) {
        const createdAfter = (since || new Date(Date.now() - 86400000)).toISOString();
        try {
            const token = await this.getLwaToken();
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.SP_API_BASE}/orders/v0/orders`, {
                params: {
                    MarketplaceIds: this.MARKETPLACE_ID,
                    CreatedAfter: createdAfter,
                    OrderStatuses: 'Unshipped,PartiallyShipped,Shipped,Pending',
                    MaxResultsPerPage: 100,
                },
                headers: { 'x-amz-access-token': token },
                timeout: 15000,
            }));
            const orders = [];
            const amazonOrders = response.data?.payload?.Orders || [];
            for (const o of amazonOrders) {
                const items = await this.getOrderItems(o.AmazonOrderId, token);
                orders.push(this.mapAmazonOrder(o, items));
                await this.delay(1100);
            }
            return orders;
        }
        catch (err) {
            this.logger.error(`Amazon SP-API hatası: ${err.message}`);
            return this.getMockOrders();
        }
    }
    async getOrderDetail(orderId) {
        const token = await this.getLwaToken();
        const [orderRes, itemsRes] = await Promise.all([
            (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.SP_API_BASE}/orders/v0/orders/${orderId}`, {
                headers: { 'x-amz-access-token': token },
            })),
            this.getOrderItems(orderId, token),
        ]);
        return this.mapAmazonOrder(orderRes.data?.payload, itemsRes);
    }
    async getOrderItems(orderId, token) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.SP_API_BASE}/orders/v0/orders/${orderId}/orderItems`, {
                headers: { 'x-amz-access-token': token },
                timeout: 10000,
            }));
            return response.data?.payload?.OrderItems || [];
        }
        catch {
            return [];
        }
    }
    async getLwaToken() {
        if (this.cachedToken && Date.now() < this.tokenExpiry) {
            return this.cachedToken;
        }
        if (!this.lwaClientId) {
            return 'MOCK_TOKEN';
        }
        const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(this.LWA_URL, {
            grant_type: 'refresh_token',
            refresh_token: this.lwaRefreshToken,
            client_id: this.lwaClientId,
            client_secret: this.lwaClientSecret,
        }));
        this.cachedToken = response.data.access_token;
        this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
        return this.cachedToken;
    }
    mapAmazonOrder(order, items) {
        const total = parseFloat(order.OrderTotal?.Amount || '0');
        return {
            orderId: order.AmazonOrderId,
            marketplace: 'AMAZON',
            status: order.OrderStatus || 'Pending',
            customerName: order.BuyerInfo?.BuyerName,
            customerEmail: order.BuyerInfo?.BuyerEmail,
            totalAmount: total,
            currency: order.OrderTotal?.CurrencyCode || 'TRY',
            orderedAt: new Date(order.PurchaseDate || Date.now()),
            lines: items.map((i) => ({
                productCode: i.SellerSKU,
                productName: i.Title,
                quantity: i.QuantityOrdered,
                unitPrice: parseFloat(i.ItemPrice?.Amount || '0') / (i.QuantityOrdered || 1),
                taxRate: 20,
                currency: i.ItemPrice?.CurrencyCode || 'TRY',
            })),
            rawPayload: { order, items },
        };
    }
    getMockOrders() {
        return [{
                orderId: `MOCK-AMZ-${Date.now()}`,
                marketplace: 'AMAZON',
                status: 'Unshipped',
                customerName: 'Amazon Test Buyer',
                customerEmail: 'amztest@example.com',
                totalAmount: 2360,
                currency: 'TRY',
                orderedAt: new Date(),
                lines: [{ productName: 'Amazon Test Ürün', quantity: 2, unitPrice: 1000, taxRate: 20, currency: 'TRY' }],
                rawPayload: { mock: true },
            }];
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
exports.AmazonAdapter = AmazonAdapter;
exports.AmazonAdapter = AmazonAdapter = AmazonAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService, String, String, String, String])
], AmazonAdapter);
//# sourceMappingURL=amazon.adapter.js.map