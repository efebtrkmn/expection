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
exports.BankingController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const banking_service_1 = require("./banking.service");
const reconciliation_service_1 = require("./reconciliation.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const tenant_guard_1 = require("../common/guards/tenant.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const current_tenant_decorator_1 = require("../common/decorators/current-tenant.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let BankingController = class BankingController {
    constructor(bankingService, reconciliationService) {
        this.bankingService = bankingService;
        this.reconciliationService = reconciliationService;
    }
    create(tenantId, dto) {
        return this.bankingService.create(tenantId, dto);
    }
    findAll(tenantId) {
        return this.bankingService.findAll(tenantId);
    }
    getTransactions(id, tenantId) {
        return this.bankingService.getTransactions(id, tenantId);
    }
    sync(id, tenantId) {
        return this.bankingService.manualSync(id, tenantId);
    }
    getUnmatched(tenantId) {
        return this.reconciliationService.getUnmatchedTransactions(tenantId);
    }
    manualMatch(txId, invoiceId, tenantId) {
        return this.reconciliationService.manualMatch(txId, invoiceId, tenantId);
    }
};
exports.BankingController = BankingController;
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.Accountant, client_1.UserRole.SuperAdmin),
    (0, common_1.Post)('accounts'),
    (0, swagger_1.ApiOperation)({ summary: 'Yeni Banka Hesabı Ekle' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, banking_service_1.CreateBankAccountDto]),
    __metadata("design:returntype", void 0)
], BankingController.prototype, "create", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.Accountant, client_1.UserRole.SuperAdmin, client_1.UserRole.Auditor),
    (0, common_1.Get)('accounts'),
    (0, swagger_1.ApiOperation)({ summary: 'Banka Hesaplarını Listele' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BankingController.prototype, "findAll", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.Accountant, client_1.UserRole.SuperAdmin, client_1.UserRole.Auditor),
    (0, common_1.Get)('accounts/:id/transactions'),
    (0, swagger_1.ApiOperation)({ summary: 'Banka Hareketlerini Listele' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BankingController.prototype, "getTransactions", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.Accountant, client_1.UserRole.SuperAdmin),
    (0, common_1.Post)('accounts/:id/sync'),
    (0, swagger_1.ApiOperation)({ summary: 'Banka Hesabını Manuel Senkronize Et (KolayBi API)' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BankingController.prototype, "sync", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.Accountant, client_1.UserRole.SuperAdmin, client_1.UserRole.Auditor),
    (0, common_1.Get)('reconciliation'),
    (0, swagger_1.ApiOperation)({ summary: 'Eşleşmemiş Banka Hareketleri Listesi' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BankingController.prototype, "getUnmatched", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.Accountant, client_1.UserRole.SuperAdmin),
    (0, common_1.Post)('reconciliation/:txId/match/:invoiceId'),
    (0, swagger_1.ApiOperation)({ summary: 'Banka Hareketi ile Faturayı Manuel Eşleştir → Fatura PAID yapılır' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('txId')),
    __param(1, (0, common_1.Param)('invoiceId')),
    __param(2, (0, current_tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], BankingController.prototype, "manualMatch", null);
exports.BankingController = BankingController = __decorate([
    (0, swagger_1.ApiTags)('Açık Bankacılık ve Mutabakat'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('banking'),
    __metadata("design:paramtypes", [banking_service_1.BankingService,
        reconciliation_service_1.ReconciliationService])
], BankingController);
//# sourceMappingURL=banking.controller.js.map