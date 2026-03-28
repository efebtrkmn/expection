import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentTenant() — Mevcut isteğin tenant ID'sini enjekte eder.
 *
 * Kullanım:
 *   @Get('invoices')
 *   findAll(@CurrentTenant() tenantId: string) { ... }
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantId;
  },
);
