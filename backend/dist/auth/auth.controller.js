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
exports.AuthController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const throttler_1 = require("@nestjs/throttler");
const auth_service_1 = require("./auth.service");
const audit_log_service_1 = require("../audit-log/audit-log.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const auth_dto_1 = require("./dto/auth.dto");
let AuthController = class AuthController {
    constructor(authService, auditLogService) {
        this.authService = authService;
        this.auditLogService = auditLogService;
    }
    async login(req, ip, userAgent) {
        return this.authService.login(req.user, ip, userAgent);
    }
    async refresh(dto, ip, userAgent) {
        return this.authService.refreshTokens(dto.refreshToken, ip, userAgent);
    }
    async logout(user, dto, ip, userAgent) {
        await this.authService.logout(user.id, user.tenantId, dto.refreshToken, ip, userAgent);
        return { message: 'Başarıyla çıkış yapıldı.' };
    }
    async logoutAll(user, ip, userAgent) {
        await this.authService.logoutAll(user.id, user.tenantId, ip, userAgent);
        return { message: 'Tüm oturumlar başarıyla kapatıldı.' };
    }
    async me(user) {
        return {
            id: user.id,
            tenantId: user.tenantId,
            email: user.email,
            role: user.role,
            fullName: user.fullName,
            customerId: user.customerId,
        };
    }
    async changePassword(user, dto, ip, userAgent) {
        await this.authService.changePassword(user.id, user.tenantId, dto.currentPassword, dto.newPassword, ip, userAgent);
        return { message: 'Şifreniz başarıyla değiştirildi. Lütfen tekrar giriş yapın.' };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, swagger_1.ApiOperation)({ description: "POST /auth/login\nE-posta + \u015Fifre ile giri\u015F, JWT access + refresh token d\u00F6ner", summary: 'Kullanıcı girişi', description: 'E-posta ve şifre ile giriş yapın' }),
    (0, roles_decorator_1.Public)(),
    (0, common_1.UseGuards)(throttler_1.ThrottlerGuard, (0, passport_1.AuthGuard)('local')),
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiBody)({ type: auth_dto_1.LoginDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Giriş başarılı, token çifti döner' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Geçersiz kimlik bilgileri' }),
    (0, swagger_1.ApiResponse)({ status: 429, description: 'Çok fazla başarısız giriş denemesi' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK, type: Object }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Ip)()),
    __param(2, (0, common_1.Headers)('user-agent')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, swagger_1.ApiOperation)({ description: "POST /auth/refresh\nRefresh token ile yeni access token al", summary: 'Token yenileme' }),
    (0, roles_decorator_1.Public)(),
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Yeni token çifti' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Geçersiz refresh token' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK, type: Object }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Ip)()),
    __param(2, (0, common_1.Headers)('user-agent')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.RefreshTokenDto, String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, swagger_1.ApiOperation)({ description: "POST /auth/logout\nMevcut refresh token'\u0131 iptal et", summary: 'Çıkış yap (mevcut oturum)' }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiBearerAuth)(),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __param(3, (0, common_1.Headers)('user-agent')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, auth_dto_1.RefreshTokenDto, String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, swagger_1.ApiOperation)({ description: "POST /auth/logout-all\nT\u00FCm cihazlardan \u00E7\u0131k\u0131\u015F yap", summary: 'Tüm oturumları kapat' }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('logout-all'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiBearerAuth)(),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Ip)()),
    __param(2, (0, common_1.Headers)('user-agent')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logoutAll", null);
__decorate([
    (0, swagger_1.ApiOperation)({ description: "GET /auth/me\nMevcut kullan\u0131c\u0131 profili", summary: 'Mevcut kullanıcı bilgisi' }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Kullanıcı profili' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "me", null);
__decorate([
    (0, swagger_1.ApiOperation)({ description: "POST /auth/change-password\n\u015Eifre de\u011Fi\u015Ftirme (mevcut \u015Fifre do\u011Frulama zorunlu)", summary: 'Şifre değiştir' }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('change-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Şifre başarıyla değiştirildi' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Mevcut şifre hatalı' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __param(3, (0, common_1.Headers)('user-agent')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, auth_dto_1.ChangePasswordDto, String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changePassword", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Kimlik Doğrulama'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        audit_log_service_1.AuditLogService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map