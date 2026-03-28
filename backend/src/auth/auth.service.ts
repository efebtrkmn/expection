import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '@prisma/client';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  role: string;
  fullName: string;
  customerId?: string | null;
}

/**
 * AuthService — Kimlik Doğrulama İş Mantığı
 *
 * - argon2id ile şifre hash/verify
 * - JWT access token üretimi (15dk)
 * - Refresh token üretimi + DB'de hash olarak saklama (7 gün)
 * - Token yenileme ve iptal (logout)
 * - Şifre değiştirme
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly ARGON2_OPTIONS = {
    type: argon2.argon2id,
    memoryCost: 65536,    // 64 MB
    timeCost: 3,           // 3 iterasyon
    parallelism: 4,        // 4 thread
  };

  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ── Kullanıcı Doğrulama ──────────────────────────────────────────

  async validateUser(
    email: string,
    password: string,
    tenantId: string,
  ): Promise<AuthUser | null> {
    const user = await this.prismaService.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        passwordHash: true,
        role: true,
        fullName: true,
        customerId: true,
      },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, password, this.ARGON2_OPTIONS);

    if (!isPasswordValid) {
      return null;
    }

    // Son giriş zamanını güncelle
    await this.prismaService.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      customerId: user.customerId,
    };
  }

  // ── Token Üretimi ────────────────────────────────────────────────

  async generateTokens(user: AuthUser, ipAddress?: string, userAgent?: string): Promise<TokenPair> {
    // Access token (kısa ömürlü)
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        tenant_id: user.tenantId,
        email: user.email,
        role: user.role,
      },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      },
    );

    // Refresh token (uzun ömürlü, kriptografik random)
    const refreshTokenRaw = randomBytes(64).toString('hex');
    const refreshTokenHash = createHash('sha256').update(refreshTokenRaw).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 gün

    await this.prismaService.refreshToken.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        tokenHash: refreshTokenHash,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenRaw,
      expiresIn: 900, // 15 dakika (saniye cinsinden)
    };
  }

  // ── Login ────────────────────────────────────────────────────────

  async login(
    user: AuthUser,
    ipAddress: string,
    userAgent: string,
  ): Promise<TokenPair & { user: Omit<AuthUser, 'passwordHash'> }> {
    const tokens = await this.generateTokens(user, ipAddress, userAgent);

    await this.auditLogService.logLogin({
      tenantId: user.tenantId,
      userId: user.id,
      email: user.email,
      ipAddress,
      userAgent,
      success: true,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        customerId: user.customerId,
      },
    };
  }

  // ── Refresh Token ─────────────────────────────────────────────────

  async refreshTokens(
    refreshTokenRaw: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<TokenPair> {
    const tokenHash = createHash('sha256').update(refreshTokenRaw).digest('hex');

    const storedToken = await this.prismaService.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: {
            id: true,
            tenantId: true,
            email: true,
            role: true,
            fullName: true,
            isActive: true,
            customerId: true,
          },
        },
      },
    });

    if (!storedToken || !storedToken.user.isActive) {
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş yenileme tokeni.');
    }

    // Token rotasyonu: eski token'ı iptal et, yeni üret
    await this.prismaService.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const user = storedToken.user;
    return this.generateTokens(
      {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        customerId: user.customerId,
      },
      ipAddress,
      userAgent,
    );
  }

  // ── Logout ──────────────────────────────────────────────────────

  async logout(
    userId: string,
    tenantId: string,
    refreshTokenRaw: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const tokenHash = createHash('sha256').update(refreshTokenRaw).digest('hex');

    await this.prismaService.refreshToken.updateMany({
      where: {
        userId,
        tenantId,
        tokenHash,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    await this.auditLogService.logLogout({ tenantId, userId, ipAddress, userAgent });
  }

  /**
   * Tüm aktif oturumları kapat (tüm cihazlardan çıkış)
   */
  async logoutAll(userId: string, tenantId: string, ipAddress: string, userAgent: string): Promise<void> {
    await this.prismaService.refreshToken.updateMany({
      where: { userId, tenantId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.auditLogService.log({
      tenantId,
      userId,
      action: AuditAction.LOGOUT,
      entityType: 'auth',
      ipAddress,
      userAgent,
      metadata: { allSessions: true },
    });
  }

  // ── Şifre Değiştirme ─────────────────────────────────────────────

  async changePassword(
    userId: string,
    tenantId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı.');
    }

    const isCurrentPasswordValid = await argon2.verify(
      user.passwordHash,
      currentPassword,
      this.ARGON2_OPTIONS,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Mevcut şifre hatalı.');
    }

    // Yeni şifrenin mevcut şifreden farklı olmasını zorunlu kıl
    const isSamePassword = await argon2.verify(
      user.passwordHash,
      newPassword,
      this.ARGON2_OPTIONS,
    );

    if (isSamePassword) {
      throw new BadRequestException('Yeni şifre mevcut şifrenizden farklı olmalıdır.');
    }

    const newPasswordHash = await argon2.hash(newPassword, this.ARGON2_OPTIONS);

    await this.prismaService.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Tüm aktif refresh token'ları iptal et (güvenlik gereği)
    await this.prismaService.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.auditLogService.log({
      tenantId,
      userId,
      action: AuditAction.PASSWORD_CHANGE,
      entityType: 'user',
      entityId: userId,
      ipAddress,
      userAgent,
    });
  }

  // ── Şifre Hash ──────────────────────────────────────────────────

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, this.ARGON2_OPTIONS) as Promise<string>;
  }
}
