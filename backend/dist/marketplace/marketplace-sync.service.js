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
var MarketplaceSyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketplaceSyncService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const axios_1 = require("@nestjs/axios");
const trendyol_adapter_1 = require("./adapters/trendyol.adapter");
const hepsiburada_adapter_1 = require("./adapters/hepsiburada.adapter");
const amazon_adapter_1 = require("./adapters/amazon.adapter");
const client_1 = require("@prisma/client");
const crypto = require("crypto");
let MarketplaceSyncService = MarketplaceSyncService_1 = class MarketplaceSyncService {
    constructor(prisma, httpService) {
        this.prisma = prisma;
        this.httpService = httpService;
        this.logger = new common_1.Logger(MarketplaceSyncService_1.name);
    }
    async scheduledSync() {
        this.logger.log('[CRON] Pazaryeri senkronizasyonu başlatılıyor...');
        const connections = await this.prisma.marketplaceConnection.findMany({
            where: { isActive: true },
        });
        for (const conn of connections) {
            try {
                await this.syncConnection(conn);
            }
            catch (err) {
                this.logger.error(`[${conn.marketplace}] Sync hatası: ${err.message}`);
            }
        }
    }
    async syncConnection(conn) {
        const adapter = this.buildAdapter(conn);
        const since = conn.lastSyncedAt ? new Date(conn.lastSyncedAt) : undefined;
        const orders = await adapter.getOrders(since);
        this.logger.log(`[${conn.marketplace}] ${orders.length} sipariş alındı`);
        for (const order of orders) {
            await this.processOrder(order, conn);
        }
        await this.prisma.marketplaceConnection.update({
            where: { id: conn.id },
            data: { lastSyncedAt: new Date() },
        });
    }
    async processOrder(order, conn) {
        const existing = await this.prisma.marketplaceOrder.findUnique({
            where: {
                tenantId_marketplace_orderId: {
                    tenantId: conn.tenantId,
                    marketplace: conn.marketplace,
                    orderId: order.orderId,
                },
            },
        });
        let dbOrder;
        if (existing) {
            dbOrder = await this.prisma.marketplaceOrder.update({
                where: { id: existing.id },
                data: { status: order.status, updatedAt: new Date() },
            });
        }
        else {
            dbOrder = await this.prisma.marketplaceOrder.create({
                data: {
                    tenantId: conn.tenantId,
                    connectionId: conn.id,
                    orderId: order.orderId,
                    marketplace: conn.marketplace,
                    status: order.status,
                    customerName: order.customerName,
                    customerEmail: order.customerEmail,
                    totalAmount: order.totalAmount,
                    currency: order.currency || 'TRY',
                    orderedAt: order.orderedAt,
                    rawPayload: order.rawPayload,
                },
            });
        }
        if (!dbOrder.invoiceId && order.status !== 'CANCELLED') {
            try {
                await this.createDraftInvoiceForOrder(order, dbOrder, conn);
            }
            catch (err) {
                this.logger.error(`Sipariş ${order.orderId} fatura oluşturma hatası: ${err.message}`);
            }
        }
    }
    async createDraftInvoiceForOrder(order, dbOrder, conn) {
        const tenantId = conn.tenantId;
        let customer = await this.prisma.customerSupplier.findFirst({
            where: {
                tenantId,
                email: order.customerEmail || undefined,
            },
        });
        if (!customer && order.customerName) {
            customer = await this.prisma.customerSupplier.create({
                data: {
                    tenantId,
                    name: order.customerName,
                    email: order.customerEmail,
                    type: client_1.CustomerSupplierType.CUSTOMER,
                    country: 'TR',
                },
            });
        }
        if (!customer) {
            this.logger.warn(`Sipariş ${order.orderId}: Müşteri oluşturulamadı, fatura atlanıyor`);
            return;
        }
        const systemUser = await this.prisma.user.findFirst({
            where: { tenantId },
            orderBy: { createdAt: 'asc' },
        });
        if (!systemUser) {
            this.logger.warn(`Tenant ${tenantId}: Kullanıcı bulunamadı`);
            return;
        }
        const shortOrderId = order.orderId.slice(-8).toUpperCase();
        const invoiceNumber = `MP-${conn.marketplace.substring(0, 2)}-${shortOrderId}`;
        const subtotal = order.lines.reduce((sum, l) => sum + (l.unitPrice * l.quantity), 0);
        const taxAmount = order.lines.reduce((sum, l) => {
            const net = (l.unitPrice * l.quantity) / (1 + l.taxRate / 100);
            return sum + ((l.unitPrice * l.quantity) - net);
        }, 0);
        const invoice = await this.prisma.invoice.create({
            data: {
                tenantId,
                customerSupplierId: customer.id,
                invoiceNumber,
                type: client_1.InvoiceType.SALES,
                status: client_1.InvoiceStatus.DRAFT,
                issueDate: order.orderedAt,
                subtotal: Math.round((subtotal - taxAmount) * 100) / 100,
                taxAmount: Math.round(taxAmount * 100) / 100,
                totalAmount: Math.round(subtotal * 100) / 100,
                currency: order.currency || 'TRY',
                notes: `${conn.marketplace} - Sipariş No: ${order.orderId}`,
                createdById: systemUser.id,
                items: {
                    create: order.lines.map(l => ({
                        tenantId,
                        description: l.productName,
                        quantity: l.quantity,
                        unit: client_1.ProductUnit.ADET,
                        unitPrice: l.unitPrice,
                        taxRate: l.taxRate,
                        lineSubtotal: Math.round((l.unitPrice * l.quantity) / (1 + l.taxRate / 100) * 100) / 100,
                        lineTax: Math.round((l.unitPrice * l.quantity - (l.unitPrice * l.quantity) / (1 + l.taxRate / 100)) * 100) / 100,
                        lineTotal: Math.round(l.unitPrice * l.quantity * 100) / 100,
                    })),
                },
            },
        });
        await this.prisma.marketplaceOrder.update({
            where: { id: dbOrder.id },
            data: { invoiceId: invoice.id },
        });
        this.logger.log(`Sipariş ${order.orderId} → DRAFT Fatura oluşturuldu: ${invoiceNumber}`);
    }
    buildAdapter(conn) {
        const apiKey = this.decrypt(conn.apiKeyEncrypted);
        const apiSecret = conn.apiSecretEncrypted ? this.decrypt(conn.apiSecretEncrypted) : '';
        const extra = conn.extraConfig || {};
        switch (conn.marketplace) {
            case 'TRENDYOL':
                return new trendyol_adapter_1.TrendyolAdapter(this.httpService, conn.sellerId, apiKey, apiSecret);
            case 'HEPSIBURADA':
                return new hepsiburada_adapter_1.HepsiburadaAdapter(this.httpService, conn.sellerId, apiKey);
            case 'AMAZON':
                return new amazon_adapter_1.AmazonAdapter(this.httpService, conn.sellerId, apiKey, apiSecret, extra.lwaRefreshToken || '');
            default:
                throw new Error(`Desteklenmeyen pazaryeri: ${conn.marketplace}`);
        }
    }
    decrypt(encrypted) {
        try {
            const encKey = process.env.APP_ENCRYPTION_KEY || 'default-32-char-key-for-dev-only!';
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
exports.MarketplaceSyncService = MarketplaceSyncService;
__decorate([
    (0, schedule_1.Cron)('0 */2 * * *', { name: 'marketplace_sync_job', timeZone: 'Europe/Istanbul' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MarketplaceSyncService.prototype, "scheduledSync", null);
exports.MarketplaceSyncService = MarketplaceSyncService = MarketplaceSyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        axios_1.HttpService])
], MarketplaceSyncService);
//# sourceMappingURL=marketplace-sync.service.js.map