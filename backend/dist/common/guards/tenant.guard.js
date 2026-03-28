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
var TenantGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const prisma_service_1 = require("../../prisma/prisma.service");
const roles_decorator_1 = require("../decorators/roles.decorator");
let TenantGuard = TenantGuard_1 = class TenantGuard {
    constructor(prismaService, reflector) {
        this.prismaService = prismaService;
        this.reflector = reflector;
        this.logger = new common_1.Logger(TenantGuard_1.name);
    }
    async canActivate(context) {
        const skipTenantCheck = this.reflector.getAllAndOverride(roles_decorator_1.SKIP_TENANT_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (skipTenantCheck) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const { user, tenantId } = request;
        if (!tenantId) {
            throw new common_1.UnauthorizedException('Tenant kimliği belirlenemedi. X-Tenant-ID header veya geçerli JWT gerekli.');
        }
        if (user && user.tenantId !== tenantId) {
            this.logger.warn(`Çapraz tenant erişimi engellendi: user_tenant=${user.tenantId}, request_tenant=${tenantId}`);
            throw new common_1.ForbiddenException('Başka bir kiracının verilerine erişim yasaktır.');
        }
        if (user?.role !== 'SuperAdmin') {
            const tenant = await this.prismaService.tenant.findUnique({
                where: { id: tenantId },
                select: { status: true, subscriptionEndsAt: true },
            });
            if (!tenant) {
                throw new common_1.ForbiddenException('Geçersiz veya silinmiş kiracı.');
            }
            if (tenant.status === 'SUSPENDED' || tenant.status === 'CANCELLED') {
                throw new common_1.ForbiddenException('Hesabınız askıya alınmıştır. Lütfen destek ile iletişime geçin.');
            }
            if (tenant.subscriptionEndsAt && tenant.subscriptionEndsAt < new Date()) {
                this.logger.warn(`Tenant ${tenantId} abonelik süresi dolmuş.`);
            }
        }
        return true;
    }
};
exports.TenantGuard = TenantGuard;
exports.TenantGuard = TenantGuard = TenantGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        core_1.Reflector])
], TenantGuard);
//# sourceMappingURL=tenant.guard.js.map