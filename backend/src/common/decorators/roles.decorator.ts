import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * @Roles() — Endpoint'e erişebilecek rolleri belirler.
 *
 * Kullanım:
 *   @Roles(UserRole.Accountant, UserRole.SuperAdmin)
 *   @Get('invoices')
 *   findAll() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * @Public() — JWT doğrulamasını atlar (login endpoint'leri için).
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * @SkipTenantCheck() — Tenant kontrolünü atlar (SuperAdmin global işlemleri için).
 */
export const SKIP_TENANT_KEY = 'skipTenantCheck';
export const SkipTenantCheck = () => SetMetadata(SKIP_TENANT_KEY, true);
