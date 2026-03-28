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
var AuditLogService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let AuditLogService = AuditLogService_1 = class AuditLogService {
    constructor(prismaService) {
        this.prismaService = prismaService;
        this.logger = new common_1.Logger(AuditLogService_1.name);
    }
    async log(data) {
        try {
            await this.prismaService.$queryRaw `
        INSERT INTO audit_logs (
          tenant_id, user_id, action, entity_type, entity_id,
          ip_address, user_agent, old_values, new_values, metadata, created_at
        ) VALUES (
          ${data.tenantId ? data.tenantId : null}::uuid,
          ${data.userId ? data.userId : null}::uuid,
          ${data.action}::"AuditAction",
          ${data.entityType || null},
          ${data.entityId || null},
          ${data.ipAddress || null},
          ${data.userAgent || null},
          ${data.oldValues ? JSON.stringify(data.oldValues) : null}::jsonb,
          ${data.newValues ? JSON.stringify(data.newValues) : null}::jsonb,
          ${data.metadata ? JSON.stringify(data.metadata) : null}::jsonb,
          NOW()
        )
      `;
        }
        catch (error) {
            this.logger.error(`Audit log yazılamadı: ${error.message}`, {
                action: data.action,
                userId: data.userId,
                tenantId: data.tenantId,
            });
        }
    }
    async logLogin(params) {
        await this.log({
            tenantId: params.tenantId,
            userId: params.userId,
            action: params.success ? client_1.AuditAction.LOGIN : client_1.AuditAction.LOGIN_FAILED,
            entityType: 'auth',
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            metadata: {
                email: params.email,
                success: params.success,
                ...(params.failureReason && { reason: params.failureReason }),
            },
        });
    }
    async logLogout(params) {
        await this.log({
            tenantId: params.tenantId,
            userId: params.userId,
            action: client_1.AuditAction.LOGOUT,
            entityType: 'auth',
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
        });
    }
    async logEntityChange(params) {
        await this.log(params);
    }
    async logExport(params) {
        await this.log({
            ...params,
            action: client_1.AuditAction.EXPORT,
        });
    }
};
exports.AuditLogService = AuditLogService;
exports.AuditLogService = AuditLogService = AuditLogService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditLogService);
//# sourceMappingURL=audit-log.service.js.map