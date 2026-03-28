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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketplaceService = exports.CreateConnectionDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const marketplace_sync_service_1 = require("./marketplace-sync.service");
const crypto = require("crypto");
class CreateConnectionDto {
}
exports.CreateConnectionDto = CreateConnectionDto;
let MarketplaceService = class MarketplaceService {
    constructor(prisma, syncService) {
        this.prisma = prisma;
        this.syncService = syncService;
    }
    async createConnection(tenantId, dto) {
        const existing = await this.prisma.marketplaceConnection.findUnique({
            where: {
                tenantId_marketplace_sellerId: {
                    tenantId,
                    marketplace: dto.marketplace,
                    sellerId: dto.sellerId,
                },
            },
        });
        if (existing)
            throw new common_1.ConflictException('Bu pazaryeri bağlantısı zaten mevcut');
        return this.prisma.marketplaceConnection.create({
            data: {
                tenantId,
                marketplace: dto.marketplace,
                sellerId: dto.sellerId,
                apiKeyEncrypted: this.encrypt(dto.apiKey),
                apiSecretEncrypted: dto.apiSecret ? this.encrypt(dto.apiSecret) : null,
                extraConfig: dto.extraConfig,
            },
        });
    }
    async getConnections(tenantId) {
        const connections = await this.prisma.marketplaceConnection.findMany({
            where: { tenantId },
        });
        return connections.map(c => ({ ...c, apiKeyEncrypted: '***', apiSecretEncrypted: '***' }));
    }
    async deleteConnection(id, tenantId) {
        const conn = await this.prisma.marketplaceConnection.findFirst({ where: { id, tenantId } });
        if (!conn)
            throw new common_1.NotFoundException('Bağlantı bulunamadı');
        await this.prisma.marketplaceConnection.delete({ where: { id } });
        return { success: true };
    }
    async getOrders(tenantId) {
        return this.prisma.marketplaceOrder.findMany({
            where: { tenantId },
            orderBy: { orderedAt: 'desc' },
        });
    }
    async syncAll(tenantId) {
        const connections = await this.prisma.marketplaceConnection.findMany({
            where: { tenantId, isActive: true },
        });
        const results = [];
        for (const conn of connections) {
            await this.syncService.syncConnection(conn);
            results.push({ marketplace: conn.marketplace, synced: true });
        }
        return results;
    }
    async syncOne(connectionId, tenantId) {
        const conn = await this.prisma.marketplaceConnection.findFirst({
            where: { id: connectionId, tenantId },
        });
        if (!conn)
            throw new common_1.NotFoundException('Bağlantı bulunamadı');
        return this.syncService.syncConnection(conn);
    }
    encrypt(plaintext) {
        try {
            const encKey = process.env.APP_ENCRYPTION_KEY || 'default-32-char-key-for-dev-only!';
            const key = Buffer.from(encKey.padEnd(32).slice(0, 32));
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
            const encrypted = cipher.update(plaintext, 'utf-8', 'hex') + cipher.final('hex');
            return `${iv.toString('hex')}:${encrypted}`;
        }
        catch {
            return plaintext;
        }
    }
};
exports.MarketplaceService = MarketplaceService;
exports.MarketplaceService = MarketplaceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        marketplace_sync_service_1.MarketplaceSyncService])
], MarketplaceService);
//# sourceMappingURL=marketplace.service.js.map