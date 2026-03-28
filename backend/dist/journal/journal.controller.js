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
exports.JournalController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const journal_service_1 = require("./journal.service");
const create_journal_dto_1 = require("./dto/create-journal.dto");
const current_tenant_decorator_1 = require("../common/decorators/current-tenant.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const tenant_guard_1 = require("../common/guards/tenant.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let JournalController = class JournalController {
    constructor(journalService) {
        this.journalService = journalService;
    }
    create(tenantId, userId, dto) {
        const payload = {
            ...dto,
            entryNumber: dto.entryDate ? `MV-${Date.now().toString().slice(-6)}` : `MV-${Date.now().toString().slice(-6)}`
        };
        return this.journalService.postJournalEntry({ ...dto, entryNumber: `JV-${Date.now()}` }, tenantId, userId);
    }
    findAll(tenantId) {
        return this.journalService.findAll(tenantId);
    }
    findOne(id, tenantId) {
        return this.journalService.findOne(id, tenantId);
    }
    setStatus(id, status, tenantId, userId) {
        return this.journalService.setStatus(id, status, tenantId, userId);
    }
};
exports.JournalController = JournalController;
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.Accountant, client_1.UserRole.SuperAdmin),
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Manuel Yevmiye Fişi Oluştur', description: 'Borç - Alacak dökümlü manuel muhasebe fişi girer.' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_journal_dto_1.CreateJournalDto]),
    __metadata("design:returntype", void 0)
], JournalController.prototype, "create", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.Accountant, client_1.UserRole.SuperAdmin, client_1.UserRole.Auditor),
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Tüm Yevmiye Fişlerini Listele' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], JournalController.prototype, "findAll", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.Accountant, client_1.UserRole.SuperAdmin, client_1.UserRole.Auditor),
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Yevmiye Fişi Detayını ve Muavin Satırlarını Getir' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], JournalController.prototype, "findOne", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.UserRole.Accountant, client_1.UserRole.SuperAdmin),
    (0, common_1.Patch)(':id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Yevmiye Fişi Durumunu Değiştir (POSTED / CANCELLED vb.)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __param(2, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], JournalController.prototype, "setStatus", null);
exports.JournalController = JournalController = __decorate([
    (0, swagger_1.ApiTags)('Yevmiye Fişleri'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('journal'),
    __metadata("design:paramtypes", [journal_service_1.JournalService])
], JournalController);
//# sourceMappingURL=journal.controller.js.map