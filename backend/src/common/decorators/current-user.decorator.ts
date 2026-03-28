import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentUser() — JWT token'dan çözümlenen kullanıcıyı enjekte eder.
 *
 * Kullanım:
 *   @Get('me')
 *   getProfile(@CurrentUser() user: RequestUser) { ... }
 *
 *   // Sadece belirli bir alan:
 *   @Get('my-invoices')
 *   find(@CurrentUser('id') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
