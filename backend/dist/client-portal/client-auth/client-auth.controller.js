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
exports.ClientAuthController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_auth_service_1 = require("./client-auth.service");
const client_login_dto_1 = require("./dto/client-login.dto");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let ClientAuthController = class ClientAuthController {
    constructor(clientAuthService) {
        this.clientAuthService = clientAuthService;
    }
    register(dto) {
        return this.clientAuthService.register(dto);
    }
    login(dto) {
        return this.clientAuthService.login(dto);
    }
};
exports.ClientAuthController = ClientAuthController;
__decorate([
    (0, common_1.Post)('register'),
    (0, swagger_1.ApiOperation)({ summary: 'Müşteri Self-Service Kayıt (Cari hesabına bağlı)' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [client_login_dto_1.ClientRegisterDto]),
    __metadata("design:returntype", void 0)
], ClientAuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Müşteri Girişi — role:CLIENT JWT döndürür' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [client_login_dto_1.ClientLoginDto]),
    __metadata("design:returntype", void 0)
], ClientAuthController.prototype, "login", null);
exports.ClientAuthController = ClientAuthController = __decorate([
    (0, swagger_1.ApiTags)('Müşteri Portalı — Kimlik Doğrulama'),
    (0, roles_decorator_1.Public)(),
    (0, common_1.Controller)('client/auth'),
    __metadata("design:paramtypes", [client_auth_service_1.ClientAuthService])
], ClientAuthController);
//# sourceMappingURL=client-auth.controller.js.map