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
exports.AiController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const ai_classification_service_1 = require("./ai-classification.service");
const ai_approval_service_1 = require("./ai-approval.service");
const classify_expense_dto_1 = require("./dto/classify-expense.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const tenant_guard_1 = require("../common/guards/tenant.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const current_tenant_decorator_1 = require("../common/decorators/current-tenant.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let AiController = class AiController {
    constructor(classificationService, approvalService) {
        this.classificationService = classificationService;
        this.approvalService = approvalService;
    }
    classify(dto, tenantId, userId) {
        return this.classificationService.classify(dto, tenantId, userId);
    }
    classifyBankTx(id, tenantId, userId) {
        return this.classificationService.classifyBankTransaction(id, tenantId, userId);
    }
    getQueue(tenantId, status) {
        return this.approvalService.getQueue(tenantId, status);
    }
    getStats(tenantId) {
        return this.classificationService.getStats(tenantId);
    }
    approve(id, dto, tenantId, userId) {
        return this.approvalService.approve(id, tenantId, userId, dto);
    }
    reject(id, dto, tenantId, userId) {
        return this.approvalService.reject(id, tenantId, userId, dto);
    }
};
exports.AiController = AiController;
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.Accountant, client_1.UserRole.SuperAdmin),
    (0, common_1.Post)('classify'),
    (0, swagger_1.ApiOperation)({ summary: 'Metin Sınıflandır → Gemini 1.5 Flash ile THP Hesap Önerisi' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [classify_expense_dto_1.ClassifyExpenseDto, String, String]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "classify", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.Accountant, client_1.UserRole.SuperAdmin),
    (0, common_1.Post)('classify/bank-tx/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Banka Hareketi Otomatik Sınıflandır' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "classifyBankTx", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.Accountant, client_1.UserRole.SuperAdmin, client_1.UserRole.Auditor),
    (0, common_1.Get)('queue'),
    (0, swagger_1.ApiOperation)({ summary: 'AI Onay Kuyruğunu Listele' }),
    (0, swagger_1.ApiQuery)({ name: 'status', enum: client_1.AiClassificationStatus, required: false }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "getQueue", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.Accountant, client_1.UserRole.SuperAdmin, client_1.UserRole.Auditor),
    (0, common_1.Get)('queue/stats'),
    (0, swagger_1.ApiOperation)({ summary: 'AI Doğruluk ve Otomasyon İstatistikleri' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "getStats", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.Accountant, client_1.UserRole.SuperAdmin),
    (0, common_1.Post)('queue/:id/approve'),
    (0, swagger_1.ApiOperation)({ summary: 'AI Önerisini İnsan Onayıyla Kabul Et (Yevmiye oluşturulur)' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, classify_expense_dto_1.ReviewClassificationDto, String, String]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "approve", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.Accountant, client_1.UserRole.SuperAdmin),
    (0, common_1.Post)('queue/:id/reject'),
    (0, swagger_1.ApiOperation)({ summary: 'AI Önerisini Reddet' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, classify_expense_dto_1.ReviewClassificationDto, String, String]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "reject", null);
exports.AiController = AiController = __decorate([
    (0, swagger_1.ApiTags)('Yapay Zeka — Gider Sınıflandırma ve Onay Kuyruğu'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('ai'),
    __metadata("design:paramtypes", [ai_classification_service_1.AiClassificationService,
        ai_approval_service_1.AiApprovalService])
], AiController);
//# sourceMappingURL=ai.controller.js.map