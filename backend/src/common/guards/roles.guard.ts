import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * RolesGuard
 *
 * @Roles() decorator ile tanımlanmış rolleri kontrol eder.
 * SuperAdmin her role sahipmiş gibi davranır (cross-cutting yetki).
 *
 * Guard Zinciri: JwtAuthGuard → TenantGuard → RolesGuard → Handler
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // @Roles() tanımlanmamışsa — sadece giriş yapmış olmak yeterli
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Kimlik doğrulama gerekli');
    }

    // SuperAdmin her şeye erişebilir
    if (user.role === UserRole.SuperAdmin) {
      return true;
    }

    const hasRole = requiredRoles.includes(user.role as UserRole);

    if (!hasRole) {
      this.logger.warn(
        `Yetkisiz erişim: user=${user.id}, role=${user.role}, required=[${requiredRoles.join(',')}]`,
      );
      throw new ForbiddenException(
        `Bu işlem için yetkiniz bulunmamaktadır. Gerekli roller: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
