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
var ProductsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const audit_log_service_1 = require("../audit-log/audit-log.service");
const client_1 = require("@prisma/client");
const decimal_js_1 = require("decimal.js");
let ProductsService = ProductsService_1 = class ProductsService {
    constructor(prisma, auditLog, eventEmitter) {
        this.prisma = prisma;
        this.auditLog = auditLog;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(ProductsService_1.name);
    }
    async create(tenantId, userId, dto) {
        const existing = await this.prisma.product.findUnique({
            where: {
                tenantId_code: { tenantId, code: dto.code }
            }
        });
        if (existing) {
            throw new common_1.ConflictException(`Bu stok kodu (${dto.code}) zaten sistemde mevcut.`);
        }
        const product = await this.prisma.product.create({
            data: {
                tenantId,
                code: dto.code,
                name: dto.name,
                description: dto.description,
                unit: dto.unit,
                unitPrice: dto.unitPrice,
                taxRate: dto.taxRate,
                stockQuantity: dto.stockQuantity || 0,
                criticalStockLevel: dto.criticalStockLevel || null,
                trackStock: dto.trackStock ?? true,
                salesAccountCode: dto.salesAccountCode || '600',
                cogsAccountCode: dto.cogsAccountCode || '620',
                isActive: dto.isActive ?? true,
            }
        });
        await this.auditLog.logEntityChange({
            tenantId,
            userId,
            action: client_1.AuditAction.CREATE,
            entityType: 'product',
            entityId: product.id,
            newValues: product,
        });
        return product;
    }
    async findAll(tenantId, search) {
        const whereClause = { tenantId };
        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } }
            ];
        }
        return this.prisma.product.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        });
    }
    async findOne(id, tenantId) {
        const product = await this.prisma.product.findFirst({
            where: { id, tenantId }
        });
        if (!product)
            throw new common_1.NotFoundException('Ürün/Hizmet bulunamadı');
        return product;
    }
    async update(id, tenantId, userId, dto) {
        const product = await this.findOne(id, tenantId);
        const updated = await this.prisma.product.update({
            where: { id },
            data: dto
        });
        await this.auditLog.logEntityChange({
            tenantId,
            userId,
            action: client_1.AuditAction.UPDATE,
            entityType: 'product',
            entityId: product.id,
            oldValues: product,
            newValues: updated,
        });
        return updated;
    }
    async remove(id, tenantId, userId) {
        const product = await this.findOne(id, tenantId);
        await this.prisma.product.delete({
            where: { id }
        });
        await this.auditLog.logEntityChange({
            tenantId,
            userId,
            action: client_1.AuditAction.DELETE,
            entityType: 'product',
            entityId: product.id,
            oldValues: product,
        });
        return { success: true };
    }
    async reduceStockLevels(tenantId, items) {
        for (const item of items) {
            if (!item.productId)
                continue;
            const product = await this.prisma.product.findFirst({
                where: { id: item.productId, tenantId }
            });
            if (product && product.trackStock) {
                const newStock = new decimal_js_1.Decimal(product.stockQuantity).minus(item.quantity);
                await this.prisma.product.update({
                    where: { id: product.id },
                    data: { stockQuantity: newStock.toNumber() }
                });
                this.logger.log(`Stock reduced: ${product.name} (ID: ${product.id}) - New Balance: ${newStock.toNumber()}`);
                if (product.criticalStockLevel !== null && newStock.lessThanOrEqualTo(product.criticalStockLevel)) {
                    this.eventEmitter.emit('stock.alert', {
                        tenantId,
                        productId: product.id,
                        productName: product.name,
                        currentStock: newStock.toNumber(),
                        criticalLevel: product.criticalStockLevel.toNumber()
                    });
                }
            }
        }
    }
    async getLowStockProducts(tenantId) {
        return this.prisma.$queryRaw `
      SELECT id, code, name, stock_quantity as "stockQuantity", critical_stock_level as "criticalStockLevel"
      FROM products
      WHERE tenant_id = ${tenantId}::uuid
        AND track_stock = true
        AND critical_stock_level IS NOT NULL
        AND stock_quantity <= critical_stock_level
      ORDER BY stock_quantity ASC
    `;
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = ProductsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_log_service_1.AuditLogService,
        event_emitter_1.EventEmitter2])
], ProductsService);
//# sourceMappingURL=products.service.js.map