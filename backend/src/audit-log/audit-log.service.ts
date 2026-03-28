import { Injectable, Logger } from '@nestjs/common';
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

/**
 * AuditLogService — KVKK Uyumlu Denetim Log Servisi
 *
 * ÖNEMLI: Bu servis YALNIZCA INSERT işlemi yapar.
 * Audit logları hiçbir zaman güncellenmez veya silinemez (DB seviyesinde kısıtlı).
 *
 * Kullanım:
 *   await this.auditLogService.log({
 *     tenantId: user.tenantId,
 *     userId: user.id,
 *     action: AuditAction.CREATE,
 *     entityType: 'invoice',
 *     entityId: invoice.id,
 *     ipAddress: req.ip,
 *     newValues: createDto,
 *   });
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Denetim logu yaz (fire-and-forget, hata fırlatmaz)
   * Ana iş akışını engellemez.
   */
  async log(data: CreateAuditLogDto): Promise<void> {
    try {
      // Audit log INSERT için RLS bypass gerekmez; politika INSERT'e izin veriyor
      await this.prismaService.$queryRaw`
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
    } catch (error) {
      // Loglama hatası asla ana işlemi başarısız yapmamalı
      this.logger.error(`Audit log yazılamadı: ${error.message}`, {
        action: data.action,
        userId: data.userId,
        tenantId: data.tenantId,
      });
    }
  }

  /**
   * Giriş denemesi logu (başarılı/başarısız)
   */
  async logLogin(params: {
    tenantId?: string;
    userId?: string;
    email: string;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    failureReason?: string;
  }): Promise<void> {
    await this.log({
      tenantId: params.tenantId,
      userId: params.userId,
      action: params.success ? AuditAction.LOGIN : AuditAction.LOGIN_FAILED,
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

  /**
   * Çıkış logu
   */
  async logLogout(params: {
    tenantId: string;
    userId: string;
    ipAddress: string;
    userAgent: string;
  }): Promise<void> {
    await this.log({
      tenantId: params.tenantId,
      userId: params.userId,
      action: AuditAction.LOGOUT,
      entityType: 'auth',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * Entity değişiklik logu (create/update/delete)
   */
  async logEntityChange(params: {
    tenantId: string;
    userId: string;
    action: AuditAction.CREATE | AuditAction.UPDATE | AuditAction.DELETE;
    entityType: string;
    entityId: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    ipAddress?: string;
  }): Promise<void> {
    await this.log(params);
  }

  /**
   * Dışa aktarma logu (KVKK: kişisel veri ihracını kaydet)
   */
  async logExport(params: {
    tenantId: string;
    userId: string;
    entityType: string;
    ipAddress: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.log({
      ...params,
      action: AuditAction.EXPORT,
    });
  }
}
