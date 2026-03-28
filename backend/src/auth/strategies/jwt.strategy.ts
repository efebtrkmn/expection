import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;        // user_id
  tenant_id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * JwtStrategy — Bearer token doğrulama stratejisi
 *
 * Token doğrulandıktan sonra kullanıcıyı DB'den çekerek request.user'a atar.
 * Kullanıcının veya tenant'ın silinip silinmediğini de kontrol eder.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        tenantId: true,
        email: true,
        role: true,
        fullName: true,
        isActive: true,
        customerId: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Kullanıcı bulunamadı veya hesap devre dışı.');
    }

    // JWT payload ile DB kaydının tutarlılığını kontrol et
    if (user.tenantId !== payload.tenant_id) {
      throw new UnauthorizedException('Token geçersiz: tenant uyuşmazlığı.');
    }

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      customerId: user.customerId,
    };
  }
}
