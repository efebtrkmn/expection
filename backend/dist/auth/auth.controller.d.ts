import { AuthService } from './auth.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RefreshTokenDto, ChangePasswordDto } from './dto/auth.dto';
export declare class AuthController {
    private readonly authService;
    private readonly auditLogService;
    constructor(authService: AuthService, auditLogService: AuditLogService);
    login(req: any, ip: string, userAgent: string): Promise<import("./auth.service").TokenPair & {
        user: Omit<import("./auth.service").AuthUser, "passwordHash">;
    }>;
    refresh(dto: RefreshTokenDto, ip: string, userAgent: string): Promise<import("./auth.service").TokenPair>;
    logout(user: any, dto: RefreshTokenDto, ip: string, userAgent: string): Promise<{
        message: string;
    }>;
    logoutAll(user: any, ip: string, userAgent: string): Promise<{
        message: string;
    }>;
    me(user: any): Promise<{
        id: any;
        tenantId: any;
        email: any;
        role: any;
        fullName: any;
        customerId: any;
    }>;
    changePassword(user: any, dto: ChangePasswordDto, ip: string, userAgent: string): Promise<{
        message: string;
    }>;
}
