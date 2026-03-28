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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientJwtGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
let ClientJwtGuard = class ClientJwtGuard {
    constructor(jwtService, config) {
        this.jwtService = jwtService;
        this.config = config;
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const auth = request.headers.authorization;
        if (!auth || !auth.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('Müşteri token gerekli');
        }
        const token = auth.split(' ')[1];
        try {
            const secret = this.config.get('JWT_CLIENT_SECRET') || this.config.get('JWT_SECRET');
            const payload = this.jwtService.verify(token, { secret });
            if (payload.role !== 'CLIENT') {
                throw new common_1.UnauthorizedException('Bu alan yalnızca müşteri portalı kullanıcılarına açıktır.');
            }
            request.clientUser = {
                id: payload.sub,
                tenantId: payload.tenantId,
                contactId: payload.contactId,
                email: payload.email,
            };
            return true;
        }
        catch (err) {
            throw new common_1.UnauthorizedException('Geçersiz veya süresi dolmuş token');
        }
    }
};
exports.ClientJwtGuard = ClientJwtGuard;
exports.ClientJwtGuard = ClientJwtGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService])
], ClientJwtGuard);
//# sourceMappingURL=client-jwt.guard.js.map