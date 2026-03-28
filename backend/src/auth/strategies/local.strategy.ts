import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

/**
 * LocalStrategy — Email + Şifre kimlik doğrulama stratejisi
 *
 * passport-local varsayılan olarak username alanını kullanır;
 * biz email kullanacağımız için usernameField: 'email' override'ı gerekli.
 *
 * Kullanıcı adı + tenant_id kombinasyonunu doğrular.
 * (Aynı email farklı tenant'larda kullanılabilir)
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  async validate(req: any, email: string, password: string): Promise<any> {
    const tenantId = req.tenantId || req.headers['x-tenant-id'];

    if (!tenantId) {
      throw new UnauthorizedException(
        'Tenant kimliği gerekli. X-Tenant-ID header veya domain çözümlemesi kullanın.',
      );
    }

    const user = await this.authService.validateUser(email, password, tenantId);

    if (!user) {
      throw new UnauthorizedException('E-posta veya şifre hatalı.');
    }

    return user;
  }
}
