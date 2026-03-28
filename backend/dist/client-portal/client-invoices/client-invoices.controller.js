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
exports.ClientInvoicesController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_invoices_service_1 = require("./client-invoices.service");
const client_statement_service_1 = require("../client-statement/client-statement.service");
const client_jwt_guard_1 = require("../guards/client-jwt.guard");
let ClientInvoicesController = class ClientInvoicesController {
    constructor(invoicesService, statementService) {
        this.invoicesService = invoicesService;
        this.statementService = statementService;
    }
    getSummary(req) {
        return this.invoicesService.getMySummary(req.clientUser.contactId, req.clientUser.tenantId);
    }
    getInvoices(req) {
        return this.invoicesService.getMyInvoices(req.clientUser.contactId, req.clientUser.tenantId);
    }
    getInvoiceDetail(id, req) {
        return this.invoicesService.getMyInvoiceDetail(id, req.clientUser.contactId, req.clientUser.tenantId);
    }
    async downloadPdf(req, res) {
        const pdf = await this.statementService.generateStatementPdf(req.clientUser.contactId, req.clientUser.tenantId);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="ekstre_${Date.now()}.pdf"`,
            'Content-Length': pdf.length,
        });
        res.end(pdf);
    }
};
exports.ClientInvoicesController = ClientInvoicesController;
__decorate([
    (0, common_1.Get)('summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Musteri Bakiye Ozeti' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ClientInvoicesController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('invoices'),
    (0, swagger_1.ApiOperation)({ summary: 'Kendi Faturalarim' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ClientInvoicesController.prototype, "getInvoices", null);
__decorate([
    (0, common_1.Get)('invoices/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Fatura Detayi' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ClientInvoicesController.prototype, "getInvoiceDetail", null);
__decorate([
    (0, common_1.Get)('statement/pdf'),
    (0, swagger_1.ApiOperation)({ summary: 'Cari Ekstre PDF Indir' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ClientInvoicesController.prototype, "downloadPdf", null);
exports.ClientInvoicesController = ClientInvoicesController = __decorate([
    (0, swagger_1.ApiTags)('Musteri Portali - Faturalar ve Ekstre'),
    (0, common_1.UseGuards)(client_jwt_guard_1.ClientJwtGuard),
    (0, common_1.Controller)('client'),
    __metadata("design:paramtypes", [client_invoices_service_1.ClientInvoicesService,
        client_statement_service_1.ClientStatementService])
], ClientInvoicesController);
//# sourceMappingURL=client-invoices.controller.js.map