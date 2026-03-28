import { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export interface CreateAuditLogDto {
    tenantId?: string;
    userId?: string;
    action: AuditAction;
    entityType?: string;
    entityId?: string;
    ipAddress?: string;
    userAgent?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    metadata?: Record<string, any>;
}
export declare class AuditLogService {
    private readonly prismaService;
    private readonly logger;
    constructor(prismaService: PrismaService);
    log(data: CreateAuditLogDto): Promise<void>;
    logLogin(params: {
        tenantId?: string;
        userId?: string;
        email: string;
        ipAddress: string;
        userAgent: string;
        success: boolean;
        failureReason?: string;
    }): Promise<void>;
    logLogout(params: {
        tenantId: string;
        userId: string;
        ipAddress: string;
        userAgent: string;
    }): Promise<void>;
    logEntityChange(params: {
        tenantId: string;
        userId: string;
        action: AuditAction;
        entityType: string;
        entityId: string;
        oldValues?: Record<string, any>;
        newValues?: Record<string, any>;
        ipAddress?: string;
    }): Promise<void>;
    logExport(params: {
        tenantId: string;
        userId: string;
        entityType: string;
        ipAddress: string;
        metadata?: Record<string, any>;
    }): Promise<void>;
}
