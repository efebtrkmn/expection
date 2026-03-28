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
exports.PaymentsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const iyzico_service_1 = require("./iyzico/iyzico.service");
const iyzico_callback_service_1 = require("./iyzico/iyzico-callback.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const tenant_guard_1 = require("../common/guards/tenant.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const client_jwt_guard_1 = require("../client-portal/guards/client-jwt.guard");
const current_tenant_decorator_1 = require("../common/decorators/current-tenant.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const roles_decorator_2 = require("../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
class SaveIyzicoSettingsDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SaveIyzicoSettingsDto.prototype, "apiKey", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SaveIyzicoSettingsDto.prototype, "secretKey", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SaveIyzicoSettingsDto.prototype, "subMerchantType", void 0);
let PaymentsController = class PaymentsController {
    constructor(iyzicoService, callbackService) {
        this.iyzicoService = iyzicoService;
        this.callbackService = callbackService;
    }
    async saveSettings(dto, tenantId) {
        return { message: 'Iyzico ayarlari kaydedildi', tenantId };
    }
    onboard(tenantId) {
        return this.iyzicoService.onboardSubMerchant(tenantId);
    }
    initCheckout(invoiceId, req) {
        return this.iyzicoService.initializeCheckout(invoiceId, req.clientUser.tenantId, req.clientUser.contactId);
    }
    handleCallback(payload, signature) {
        return this.callbackService.handleCallback(payload, signature);
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SuperAdmin),
    (0, common_1.Post)('iyzico/settings'),
    (0, swagger_1.ApiOperation)({ summary: 'Iyzico API Anahtarlarini Kaydet' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SaveIyzicoSettingsDto, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "saveSettings", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SuperAdmin),
    (0, common_1.Post)('iyzico/onboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Iyzico Sub-Merchant Onboarding' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "onboard", null);
__decorate([
    (0, common_1.UseGuards)(client_jwt_guard_1.ClientJwtGuard),
    (0, common_1.Post)('iyzico/checkout/:invoiceId'),
    (0, swagger_1.ApiOperation)({ summary: 'Fatura icin Iyzico Checkout Form Baslat' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Param)('invoiceId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "initCheckout", null);
__decorate([
    (0, roles_decorator_2.Public)(),
    (0, common_1.Post)('iyzico/callback'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Iyzico Odeme Sonuc Bildirimi - Webhook' }),
    (0, swagger_1.ApiHeader)({ name: 'iyzicoSignature', description: 'Iyzico HMAC imzasi', required: false }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('iyzicoSignature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "handleCallback", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, swagger_1.ApiTags)('Odeme Sistemi - Iyzico Pazaryeri'),
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [iyzico_service_1.IyzicoService,
        iyzico_callback_service_1.IyzicoCallbackService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map