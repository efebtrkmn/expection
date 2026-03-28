import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { SKIP_TENANT_KEY } from '../decorators/roles.decorator';

/**
 * TenantGuard
 *
 * JWT doğrulamasından sonra çalışır; şunları kontrol eder:
 *   1. request.tenantId var mı?
 *   2. Tenant veritabanında mevcut mu?
 *   3. Tenant durumu ACTIVE veya TRIAL mi?
 *   4. user.tenantId ile request.tenantId eşleşiyor mu? (çapraz tenant koruması)
 *
 * @SkipTenantCheck() decorator ile SuperAdmin global işlemleri için atlanabilir.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipTenantCheck = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipTenantCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user, tenantId } = request;

    if (!tenantId) {
      throw new UnauthorizedException(
        'Tenant kimliği belirlenemedi. X-Tenant-ID header veya geçerli JWT gerekli.',
      );
    }

    // Kullanıcı kendi tenant'ına mı erişiyor?
    if (user && user.tenantId !== tenantId) {
      this.logger.warn(
        `Çapraz tenant erişimi engellendi: user_tenant=${user.tenantId}, request_tenant=${tenantId}`,
      );
      throw new ForbiddenException('Başka bir kiracının verilerine erişim yasaktır.');
    }

    // Tenant'ın aktif olduğunu doğrula (SuperAdmin hariç)
    if (user?.role !== 'SuperAdmin') {
      const tenant = await this.prismaService.tenant.findUnique({
        where: { id: tenantId },
        select: { status: true, subscriptionEndsAt: true },
      });

      if (!tenant) {
        throw new ForbiddenException('Geçersiz veya silinmiş kiracı.');
      }

      if (tenant.status === 'SUSPENDED' || tenant.status === 'CANCELLED') {
        throw new ForbiddenException('Hesabınız askıya alınmıştır. Lütfen destek ile iletişime geçin.');
      }

      // Abonelik süresi dolmuşsa uyar (403 değil, bilgisel)
      if (tenant.subscriptionEndsAt && tenant.subscriptionEndsAt < new Date()) {
        this.logger.warn(`Tenant ${tenantId} abonelik süresi dolmuş.`);
        // Soft kontrolü aktive et veya ödeme yönlendirmesi ekle
      }
    }

    return true;
  }
}
