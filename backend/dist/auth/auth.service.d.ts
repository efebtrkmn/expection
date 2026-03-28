import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export interface AuthUser {
    id: string;
    tenantId: string;
    email: string;
    role: string;
    fullName: string;
    customerId?: string | null;
}
export declare class AuthService {
    private readonly prismaService;
    private readonly jwtService;
    private readonly configService;
    private readonly auditLogService;
    private readonly logger;
    private readonly ARGON2_OPTIONS;
    constructor(prismaService: PrismaService, jwtService: JwtService, configService: ConfigService, auditLogService: AuditLogService);
    validateUser(email: string, password: string, tenantId: string): Promise<AuthUser | null>;
    generateTokens(user: AuthUser, ipAddress?: string, userAgent?: string): Promise<TokenPair>;
    login(user: AuthUser, ipAddress: string, userAgent: string): Promise<TokenPair & {
        user: Omit<AuthUser, 'passwordHash'>;
    }>;
    refreshTokens(refreshTokenRaw: string, ipAddress: string, userAgent: string): Promise<TokenPair>;
    logout(userId: string, tenantId: string, refreshTokenRaw: string, ipAddress: string, userAgent: string): Promise<void>;
    logoutAll(userId: string, tenantId: string, ipAddress: string, userAgent: string): Promise<void>;
    changePassword(userId: string, tenantId: string, currentPassword: string, newPassword: string, ipAddress: string, userAgent: string): Promise<void>;
    hashPassword(password: string): Promise<string>;
}
