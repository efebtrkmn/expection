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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const argon2 = require("argon2");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_log_service_1 = require("../audit-log/audit-log.service");
const client_1 = require("@prisma/client");
let AuthService = AuthService_1 = class AuthService {
    constructor(prismaService, jwtService, configService, auditLogService) {
        this.prismaService = prismaService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.auditLogService = auditLogService;
        this.logger = new common_1.Logger(AuthService_1.name);
        this.ARGON2_OPTIONS = {
            type: argon2.argon2id,
            memoryCost: 65536,
            timeCost: 3,
            parallelism: 4,
        };
    }
    async validateUser(email, password, tenantId) {
        const user = await this.prismaService.user.findFirst({
            where: {
                email: email.toLowerCase().trim(),
                tenantId,
                isActive: true,
            },
            select: {
                id: true,
                tenantId: true,
                email: true,
                passwordHash: true,
                role: true,
                fullName: true,
                customerId: true,
            },
        });
        if (!user) {
            return null;
        }
        const isPasswordValid = await argon2.verify(user.passwordHash, password, this.ARGON2_OPTIONS);
        if (!isPasswordValid) {
            return null;
        }
        await this.prismaService.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        return {
            id: user.id,
            tenantId: user.tenantId,
            email: user.email,
            role: user.role,
            fullName: user.fullName,
            customerId: user.customerId,
        };
    }
    async generateTokens(user, ipAddress, userAgent) {
        const accessToken = this.jwtService.sign({
            sub: user.id,
            tenant_id: user.tenantId,
            email: user.email,
            role: user.role,
        }, {
            secret: this.configService.get('JWT_SECRET'),
            expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m'),
        });
        const refreshTokenRaw = (0, crypto_1.randomBytes)(64).toString('hex');
        const refreshTokenHash = (0, crypto_1.createHash)('sha256').update(refreshTokenRaw).digest('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await this.prismaService.refreshToken.create({
            data: {
                userId: user.id,
                tenantId: user.tenantId,
                tokenHash: refreshTokenHash,
                expiresAt,
                ipAddress,
                userAgent,
            },
        });
        return {
            accessToken,
            refreshToken: refreshTokenRaw,
            expiresIn: 900,
        };
    }
    async login(user, ipAddress, userAgent) {
        const tokens = await this.generateTokens(user, ipAddress, userAgent);
        await this.auditLogService.logLogin({
            tenantId: user.tenantId,
            userId: user.id,
            email: user.email,
            ipAddress,
            userAgent,
            success: true,
        });
        return {
            ...tokens,
            user: {
                id: user.id,
                tenantId: user.tenantId,
                email: user.email,
                role: user.role,
                fullName: user.fullName,
                customerId: user.customerId,
            },
        };
    }
    async refreshTokens(refreshTokenRaw, ipAddress, userAgent) {
        const tokenHash = (0, crypto_1.createHash)('sha256').update(refreshTokenRaw).digest('hex');
        const storedToken = await this.prismaService.refreshToken.findFirst({
            where: {
                tokenHash,
                revokedAt: null,
                expiresAt: { gt: new Date() },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        tenantId: true,
                        email: true,
                        role: true,
                        fullName: true,
                        isActive: true,
                        customerId: true,
                    },
                },
            },
        });
        if (!storedToken || !storedToken.user.isActive) {
            throw new common_1.UnauthorizedException('Geçersiz veya süresi dolmuş yenileme tokeni.');
        }
        await this.prismaService.refreshToken.update({
            where: { id: storedToken.id },
            data: { revokedAt: new Date() },
        });
        const user = storedToken.user;
        return this.generateTokens({
            id: user.id,
            tenantId: user.tenantId,
            email: user.email,
            role: user.role,
            fullName: user.fullName,
            customerId: user.customerId,
        }, ipAddress, userAgent);
    }
    async logout(userId, tenantId, refreshTokenRaw, ipAddress, userAgent) {
        const tokenHash = (0, crypto_1.createHash)('sha256').update(refreshTokenRaw).digest('hex');
        await this.prismaService.refreshToken.updateMany({
            where: {
                userId,
                tenantId,
                tokenHash,
                revokedAt: null,
            },
            data: { revokedAt: new Date() },
        });
        await this.auditLogService.logLogout({ tenantId, userId, ipAddress, userAgent });
    }
    async logoutAll(userId, tenantId, ipAddress, userAgent) {
        await this.prismaService.refreshToken.updateMany({
            where: { userId, tenantId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        await this.auditLogService.log({
            tenantId,
            userId,
            action: client_1.AuditAction.LOGOUT,
            entityType: 'auth',
            ipAddress,
            userAgent,
            metadata: { allSessions: true },
        });
    }
    async changePassword(userId, tenantId, currentPassword, newPassword, ipAddress, userAgent) {
        const user = await this.prismaService.user.findUnique({
            where: { id: userId },
            select: { passwordHash: true },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Kullanıcı bulunamadı.');
        }
        const isCurrentPasswordValid = await argon2.verify(user.passwordHash, currentPassword, this.ARGON2_OPTIONS);
        if (!isCurrentPasswordValid) {
            throw new common_1.UnauthorizedException('Mevcut şifre hatalı.');
        }
        const isSamePassword = await argon2.verify(user.passwordHash, newPassword, this.ARGON2_OPTIONS);
        if (isSamePassword) {
            throw new common_1.BadRequestException('Yeni şifre mevcut şifrenizden farklı olmalıdır.');
        }
        const newPasswordHash = await argon2.hash(newPassword, this.ARGON2_OPTIONS);
        await this.prismaService.user.update({
            where: { id: userId },
            data: { passwordHash: newPasswordHash },
        });
        await this.prismaService.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        await this.auditLogService.log({
            tenantId,
            userId,
            action: client_1.AuditAction.PASSWORD_CHANGE,
            entityType: 'user',
            entityId: userId,
            ipAddress,
            userAgent,
        });
    }
    async hashPassword(password) {
        return argon2.hash(password, this.ARGON2_OPTIONS);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        audit_log_service_1.AuditLogService])
], AuthService);
//# sourceMappingURL=auth.service.js.map