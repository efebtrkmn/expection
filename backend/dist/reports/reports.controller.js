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
exports.ReportsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const reports_service_1 = require("./reports.service");
const babs_service_1 = require("./babs.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const tenant_guard_1 = require("../common/guards/tenant.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const current_tenant_decorator_1 = require("../common/decorators/current-tenant.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let ReportsController = class ReportsController {
    constructor(reportsService, babsService) {
        this.reportsService = reportsService;
        this.babsService = babsService;
    }
    getDashboard(tenantId, start, end) {
        const periodStart = start ? new Date(start) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const periodEnd = end ? new Date(end) : new Date();
        return this.reportsService.getDashboardSummary(tenantId, periodStart, periodEnd);
    }
    getProfitAndLoss(tenantId, year) {
        return this.reportsService.getProfitAndLoss(tenantId, year);
    }
    getTrialBalance(tenantId, date) {
        const asOfDate = date ? new Date(date) : new Date();
        return this.reportsService.getTrialBalance(tenantId, asOfDate);
    }
    async getBabsForms(tenantId, period) {
        const ba = await this.babsService.getBaList(tenantId, period);
        const bs = await this.babsService.getBsList(tenantId, period);
        return {
            period,
            baFormInfo: { totalListed: Array.isArray(ba) ? ba.length : 0, data: ba },
            bsFormInfo: { totalListed: Array.isArray(bs) ? bs.length : 0, data: bs },
        };
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.SuperAdmin, client_1.UserRole.Accountant, client_1.UserRole.Auditor),
    (0, common_1.Get)('dashboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Ana Sayfa Finansal Özet Tablosu' }),
    (0, swagger_1.ApiQuery)({ name: 'start', required: false, description: 'YYYY-MM-DD' }),
    (0, swagger_1.ApiQuery)({ name: 'end', required: false, description: 'YYYY-MM-DD' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)('start')),
    __param(2, (0, common_1.Query)('end')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getDashboard", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.SuperAdmin, client_1.UserRole.Accountant, client_1.UserRole.Auditor),
    (0, common_1.Get)('profit-loss/:year'),
    (0, swagger_1.ApiOperation)({ summary: 'Aylık Gelir Tablosu (Kâr/Zarar) - Chart.js Jsonu' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('year', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getProfitAndLoss", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.SuperAdmin, client_1.UserRole.Accountant, client_1.UserRole.Auditor),
    (0, common_1.Get)('trial-balance'),
    (0, swagger_1.ApiOperation)({ summary: 'Genel Geçici Mizan (Hesap Planı Bakiyeleri)' }),
    (0, swagger_1.ApiQuery)({ name: 'date', required: false, description: 'YYYY-MM-DD' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getTrialBalance", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.SuperAdmin, client_1.UserRole.Accountant, client_1.UserRole.Auditor),
    (0, common_1.Get)('babs/:period'),
    (0, swagger_1.ApiOperation)({ summary: 'VUK 148 Kapsamında Ba ve Bs Bildirim Form Listeleri (>5000TL)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getBabsForms", null);
exports.ReportsController = ReportsController = __decorate([
    (0, swagger_1.ApiTags)('Raporlar ve Finans Merkezi'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('reports'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService,
        babs_service_1.BabsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map