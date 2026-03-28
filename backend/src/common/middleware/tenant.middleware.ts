import { Injectable, NestMiddleware, Logger, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * TenantMiddleware
 *
 * Gelen her HTTP isteğinde tenant_id'yi belirler; şu kaynaklardan sırayla arar:
 *   1. JWT Bearer token payload'ı (en güvenilir kaynak)
 *   2. X-Tenant-ID header'ı (public endpoint'ler için)
 *   3. Host/subdomain çözümleme (domain tabanlı çok kiracılık için)
 *
 * Belirlenen tenant_id şu yerlere atanır:
 *   - request.tenantId
 *   - request.headers['x-tenant-id'] (downstream için normalize)
 *
 * Auth endpoint'leri (/auth/login, /auth/refresh) tenant belirleme için
 * header veya subdomain yöntemini kullanır; JWT henüz yoktur.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  async use(req: Request & { tenantId?: string }, res: Response, next: NextFunction): Promise<void> {
    try {
      let tenantId: string | null = null;

      // ── 1. JWT token'dan tenant_id çıkar ────────────────────────
      const authHeader = req.headers['authorization'];
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
          const payload = this.jwtService.verify(token, {
            secret: this.configService.get<string>('JWT_SECRET'),
          });
          if (payload?.tenant_id) {
            tenantId = payload.tenant_id;
          }
        } catch {
          // Token geçersizse sessizce geç; JwtAuthGuard daha sonra yakalar
        }
      }

      // ── 2. X-Tenant-ID header'ından al ───────────────────────────
      if (!tenantId) {
        const headerTenantId = req.headers['x-tenant-id'] as string;
        if (headerTenantId && this.isValidUuid(headerTenantId)) {
          tenantId = headerTenantId;
        }
      }

      // ── 3. Subdomain çözümleme ─────────────────────────────────
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

      // ── Tenant ID'yi isteğe ekle ───────────────────────────────
      if (tenantId) {
        req.tenantId = tenantId;
        req.headers['x-tenant-id'] = tenantId;
        this.logger.debug(`Tenant resolved: ${tenantId} for ${req.method} ${req.path}`);
      }

      next();
    } catch (error) {
      this.logger.error(`TenantMiddleware error: ${error.message}`);
      next();
    }
  }

  private isValidUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }
}

// Express Request arayüzünü genişlet
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}
