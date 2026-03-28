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
var InvoiceStockListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceStockListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const products_service_1 = require("../../products/products.service");
const client_1 = require("@prisma/client");
let InvoiceStockListener = InvoiceStockListener_1 = class InvoiceStockListener {
    constructor(productsService) {
        this.productsService = productsService;
        this.logger = new common_1.Logger(InvoiceStockListener_1.name);
    }
    async handleStockUpdates(payload) {
        const { tenantId, invoice } = payload;
        this.logger.log(`[EVENT] Stok Analizi tetiklendi - Fatura No: ${invoice.invoiceNumber}`);
        if (!invoice.items || invoice.items.length === 0) {
            return;
        }
        try {
            if (invoice.type === client_1.InvoiceType.SALES || invoice.type === client_1.InvoiceType.RETURN_PURCHASE) {
                const reductionItems = invoice.items.map((item) => ({
                    productId: item.productId,
                    quantity: Number(item.quantity),
                }));
                await this.productsService.reduceStockLevels(tenantId, reductionItems);
                this.logger.log(`BAŞARILI: ${invoice.invoiceNumber} faturasındaki satış kalemlerinin stok düşümleri tamamlandı.`);
            }
            else if (invoice.type === client_1.InvoiceType.PURCHASE || invoice.type === client_1.InvoiceType.RETURN_SALES) {
                const additionItems = invoice.items.map((item) => ({
                    productId: item.productId,
                    quantity: -Number(item.quantity),
                }));
                await this.productsService.reduceStockLevels(tenantId, additionItems);
                this.logger.log(`BAŞARILI: ${invoice.invoiceNumber} faturasındaki alış kalemlerinin stok girişleri tamamlandı.`);
            }
        }
        catch (error) {
            this.logger.error(`KRİTİK HATA: Stoklar otomatik güncellenemedi: ${error.message} - FATURA: ${invoice.invoiceNumber}`);
        }
    }
};
exports.InvoiceStockListener = InvoiceStockListener;
__decorate([
    (0, event_emitter_1.OnEvent)('invoice.posted', { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InvoiceStockListener.prototype, "handleStockUpdates", null);
exports.InvoiceStockListener = InvoiceStockListener = InvoiceStockListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [products_service_1.ProductsService])
], InvoiceStockListener);
//# sourceMappingURL=invoice-stock.listener.js.map