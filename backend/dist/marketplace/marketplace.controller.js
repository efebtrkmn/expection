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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketplaceController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const marketplace_service_1 = require("./marketplace.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const tenant_guard_1 = require("../common/guards/tenant.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const current_tenant_decorator_1 = require("../common/decorators/current-tenant.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let MarketplaceController = class MarketplaceController {
    constructor(marketplaceService) {
        this.marketplaceService = marketplaceService;
    }
    createConnection(tenantId, dto) {
        return this.marketplaceService.createConnection(tenantId, dto);
    }
    getConnections(tenantId) {
        return this.marketplaceService.getConnections(tenantId);
    }
    deleteConnection(id, tenantId) {
        return this.marketplaceService.deleteConnection(id, tenantId);
    }
    getOrders(tenantId) {
        return this.marketplaceService.getOrders(tenantId);
    }
    syncAll(tenantId) {
        return this.marketplaceService.syncAll(tenantId);
    }
    syncOne(id, tenantId) {
        return this.marketplaceService.syncOne(id, tenantId);
    }
};
exports.MarketplaceController = MarketplaceController;
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.SuperAdmin),
    (0, common_1.Post)('connections'),
    (0, swagger_1.ApiOperation)({ summary: 'Yeni Pazaryeri Bağlantısı Ekle (API Key AES-256 ile şifrelenerek saklanır)' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, marketplace_service_1.CreateConnectionDto]),
    __metadata("design:returntype", void 0)
], MarketplaceController.prototype, "createConnection", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.SuperAdmin, client_1.UserRole.Accountant, client_1.UserRole.Auditor),
    (0, common_1.Get)('connections'),
    (0, swagger_1.ApiOperation)({ summary: 'Pazaryeri Bağlantılarını Listele (API keyleri gizlenir)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MarketplaceController.prototype, "getConnections", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.SuperAdmin),
    (0, common_1.Delete)('connections/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Pazaryeri Bağlantısını Sil' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MarketplaceController.prototype, "deleteConnection", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.SuperAdmin, client_1.UserRole.Accountant, client_1.UserRole.Auditor),
    (0, common_1.Get)('orders'),
    (0, swagger_1.ApiOperation)({ summary: 'Tüm Pazaryeri Siparişlerini Listele' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MarketplaceController.prototype, "getOrders", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.SuperAdmin, client_1.UserRole.Accountant),
    (0, common_1.Post)('sync'),
    (0, swagger_1.ApiOperation)({ summary: 'Tüm Aktif Pazaryerleri Senkronize Et (Sipariş → Taslak Fatura)' }),
    openapi.ApiResponse({ status: 201, type: [Object] }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MarketplaceController.prototype, "syncAll", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.SuperAdmin, client_1.UserRole.Accountant),
    (0, common_1.Post)('connections/:id/sync'),
    (0, swagger_1.ApiOperation)({ summary: 'Belirli Pazaryeri Bağlantısını Senkronize Et' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MarketplaceController.prototype, "syncOne", null);
exports.MarketplaceController = MarketplaceController = __decorate([
    (0, swagger_1.ApiTags)('Pazaryeri Entegrasyonları (Trendyol, Hepsiburada, Amazon)'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('marketplace'),
    __metadata("design:paramtypes", [marketplace_service_1.MarketplaceService])
], MarketplaceController);
//# sourceMappingURL=marketplace.controller.js.map