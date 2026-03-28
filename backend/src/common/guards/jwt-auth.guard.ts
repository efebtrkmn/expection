import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/roles.decorator';

/**
 * JwtAuthGuard
 *
 * Tüm korumalı endpoint'lerde JWT Bearer token doğrular.
 * @Public() decorator ile işaretlenen endpoint'leri atlar.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // @Public() decorator varsa doğrulamayı atla
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = any>(err: any, user: any, info: any): TUser {
    if (err || !user) {
      this.logger.warn(`JWT doğrulama başarısız: ${info?.message || err?.message}`);
      throw err || new UnauthorizedException('Geçersiz veya süresi dolmuş token');
    }
    return user;
  }
}
