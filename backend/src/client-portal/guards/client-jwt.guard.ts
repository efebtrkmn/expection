import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

/**
 * Client JWT Guard
 *
 * Yalnızca `role: 'CLIENT'` payload'una sahip JWT tokenlarını kabul eder.
 * Hem token doğruluğunu hem de rol kontrolünü tek seferinde yapar.
 */
@Injectable()
export class ClientJwtGuard {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const auth = request.headers.authorization;

    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('Müşteri token gerekli');
    }

    const token = auth.split(' ')[1];

    try {
      const secret = this.config.get<string>('JWT_CLIENT_SECRET') || this.config.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify(token, { secret });

      if (payload.role !== 'CLIENT') {
        throw new UnauthorizedException('Bu alan yalnızca müşteri portalı kullanıcılarına açıktır.');
      }

      // Sonraki handler'larda kullanılabilsin
      request.clientUser = {
        id: payload.sub,
        tenantId: payload.tenantId,
        contactId: payload.contactId,   // CustomerSupplier ID — her sorguya eklenir
        email: payload.email,
      };

      return true;
    } catch (err) {
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş token');
    }
  }
}
