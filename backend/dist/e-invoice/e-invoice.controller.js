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
exports.EInvoiceController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const e_invoice_service_1 = require("./e-invoice.service");
const webhook_payload_dto_1 = require("./dto/webhook-payload.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const tenant_guard_1 = require("../common/guards/tenant.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const current_tenant_decorator_1 = require("../common/decorators/current-tenant.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const roles_decorator_2 = require("../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let EInvoiceController = class EInvoiceController {
    constructor(eInvoiceService) {
        this.eInvoiceService = eInvoiceService;
    }
    sendInvoice(invoiceId, tenantId, userId) {
        return this.eInvoiceService.sendInvoice(invoiceId, tenantId, userId);
    }
    queryStatus(invoiceId, tenantId) {
        return this.eInvoiceService.queryStatus(invoiceId, tenantId);
    }
    async getXml(invoiceId, tenantId, res) {
        const xml = await this.eInvoiceService.getXml(invoiceId, tenantId);
        res.header('Content-Type', 'application/xml');
        return res.send(xml);
    }
    async handleWebhook(dto, signature, req) {
        const rawBody = (req.rawBody && req.rawBody.toString()) || JSON.stringify(dto);
        return this.eInvoiceService.handleWebhook(dto, rawBody, signature || '');
    }
};
exports.EInvoiceController = EInvoiceController;
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.Accountant, client_1.UserRole.SuperAdmin),
    (0, common_1.Post)(':invoiceId/send'),
    (0, swagger_1.ApiOperation)({ summary: 'Faturayı GİB\'e gönder (UBL-TR XML → Base64 → Entegratör)' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('invoiceId')),
    __param(1, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], EInvoiceController.prototype, "sendInvoice", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.Accountant, client_1.UserRole.SuperAdmin, client_1.UserRole.Auditor),
    (0, common_1.Get)(':invoiceId/status'),
    (0, swagger_1.ApiOperation)({ summary: 'GİB\'teki güncel e-fatura durumunu sorgula' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('invoiceId')),
    __param(1, (0, current_tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], EInvoiceController.prototype, "queryStatus", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.Accountant, client_1.UserRole.SuperAdmin, client_1.UserRole.Auditor),
    (0, common_1.Get)(':invoiceId/xml'),
    (0, swagger_1.ApiOperation)({ summary: 'Üretilen UBL-TR XML\'i görüntüle (Ham XML output)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('invoiceId')),
    __param(1, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], EInvoiceController.prototype, "getXml", null);
__decorate([
    (0, swagger_1.ApiOperation)({ description: "Entegrat\u00F6rden gelen webhook \u2014 JWT guard'dan muaf (Public)\nG\u00FCvenlik: HMAC-SHA256 imza do\u011Frulamas\u0131 ile korunur", summary: 'Özel Entegratör Webhook Alıcısı (GİB durum güncellemeleri)' }),
    (0, roles_decorator_2.Public)(),
    (0, common_1.Post)('webhook'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiHeader)({ name: 'X-Integrator-Signature', description: 'HMAC-SHA256 imzası', required: true }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-integrator-signature')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [webhook_payload_dto_1.EInvoiceWebhookDto, String, Object]),
    __metadata("design:returntype", Promise)
], EInvoiceController.prototype, "handleWebhook", null);
exports.EInvoiceController = EInvoiceController = __decorate([
    (0, swagger_1.ApiTags)('e-Fatura (GİB UBL-TR)'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('e-invoice'),
    __metadata("design:paramtypes", [e_invoice_service_1.EInvoiceService])
], EInvoiceController);
//# sourceMappingURL=e-invoice.controller.js.map