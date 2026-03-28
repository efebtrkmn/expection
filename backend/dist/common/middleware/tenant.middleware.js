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
var TenantMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantMiddleware = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../prisma/prisma.service");
let TenantMiddleware = TenantMiddleware_1 = class TenantMiddleware {
    constructor(jwtService, configService, prismaService) {
        this.jwtService = jwtService;
        this.configService = configService;
        this.prismaService = prismaService;
        this.logger = new common_1.Logger(TenantMiddleware_1.name);
    }
    async use(req, res, next) {
        try {
            let tenantId = null;
            const authHeader = req.headers['authorization'];
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.slice(7);
                try {
                    const payload = this.jwtService.verify(token, {
                        secret: this.configService.get('JWT_SECRET'),
                    });
                    if (payload?.tenant_id) {
                        tenantId = payload.tenant_id;
                    }
                }
                catch {
                }
            }
            if (!tenantId) {
                const headerTenantId = req.headers['x-tenant-id'];
                if (headerTenantId && this.isValidUuid(headerTenantId)) {
                    tenantId = headerTenantId;
                }
            }
            if (!tenantId) {
                const domain = req.hostname;
                if (domain && domain !== 'localhost') {
                    const tenant = await this.prismaService.tenant.findFirst({
                        where: { domain, status: { not: 'SUSPENDED' } },
                        select: { id: true },
                    });
                    if (tenant) {
                        tenantId = tenant.id;
                    }
                }
            }
            if (tenantId) {
                req.tenantId = tenantId;
                req.headers['x-tenant-id'] = tenantId;
                this.logger.debug(`Tenant resolved: ${tenantId} for ${req.method} ${req.path}`);
            }
            next();
        }
        catch (error) {
            this.logger.error(`TenantMiddleware error: ${error.message}`);
            next();
        }
    }
    isValidUuid(value) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    }
};
exports.TenantMiddleware = TenantMiddleware;
exports.TenantMiddleware = TenantMiddleware = TenantMiddleware_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService,
        prisma_service_1.PrismaService])
], TenantMiddleware);
//# sourceMappingURL=tenant.middleware.js.map