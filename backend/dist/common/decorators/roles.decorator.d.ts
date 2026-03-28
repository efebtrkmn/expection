import { UserRole } from '@prisma/client';
export declare const ROLES_KEY = "roles";
export declare const Roles: (...roles: UserRole[]) => import("@nestjs/common").CustomDecorator<string>;
export declare const IS_PUBLIC_KEY = "isPublic";
export declare const Public: () => import("@nestjs/common").CustomDecorator<string>;
export declare const SKIP_TENANT_KEY = "skipTenantCheck";
export declare const SkipTenantCheck: () => import("@nestjs/common").CustomDecorator<string>;
