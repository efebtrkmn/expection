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
exports.ReconciliationController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const reconciliation_service_1 = require("./reconciliation.service");
const reconciliation_dto_1 = require("./dto/reconciliation.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const tenant_guard_1 = require("../common/guards/tenant.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const current_tenant_decorator_1 = require("../common/decorators/current-tenant.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const roles_decorator_2 = require("../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let ReconciliationController = class ReconciliationController {
    constructor(reconciliationService) {
        this.reconciliationService = reconciliationService;
    }
    send(dto, tenantId, userId) {
        return this.reconciliationService.sendReconciliation(dto, tenantId, userId);
    }
    list(tenantId) {
        return this.reconciliationService.list(tenantId);
    }
    verify(token) {
        return this.reconciliationService.verifyToken(token);
    }
    respond(token, dto, req) {
        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
            || req.connection?.remoteAddress
            || req.ip
            || 'unknown';
        return this.reconciliationService.respond(token, dto, ipAddress);
    }
};
exports.ReconciliationController = ReconciliationController;
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.Accountant, client_1.UserRole.SuperAdmin),
    (0, common_1.Post)('send'),
    (0, swagger_1.ApiOperation)({ summary: 'Cariye Mutabakat E-postası Gönder (Magic Link ile)' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reconciliation_dto_1.SendReconciliationDto, String, String]),
    __metadata("design:returntype", void 0)
], ReconciliationController.prototype, "send", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.Accountant, client_1.UserRole.SuperAdmin, client_1.UserRole.Auditor),
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Mutabakat Talepleri Listesi' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReconciliationController.prototype, "list", null);
__decorate([
    (0, roles_decorator_2.Public)(),
    (0, common_1.Get)('verify'),
    (0, swagger_1.ApiOperation)({ summary: 'Mutabakat Tokenını Doğrula ve Bakiyeyi Göster (Müşteri — şifre gerekmez)' }),
    (0, swagger_1.ApiQuery)({ name: 'token', description: 'Magic link token' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReconciliationController.prototype, "verify", null);
__decorate([
    (0, roles_decorator_2.Public)(),
    (0, common_1.Post)('respond'),
    (0, swagger_1.ApiOperation)({ summary: 'Mutabakatı Onayla veya Reddet (IP ve zaman damgası loglanır)' }),
    (0, swagger_1.ApiQuery)({ name: 'token', description: 'Magic link token' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Query)('token')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, reconciliation_dto_1.RespondReconciliationDto, Object]),
    __metadata("design:returntype", void 0)
], ReconciliationController.prototype, "respond", null);
exports.ReconciliationController = ReconciliationController = __decorate([
    (0, swagger_1.ApiTags)('E-Mutabakat Sistemi'),
    (0, common_1.Controller)('reconciliation'),
    __metadata("design:paramtypes", [reconciliation_service_1.ReconciliationService])
], ReconciliationController);
//# sourceMappingURL=reconciliation.controller.js.map