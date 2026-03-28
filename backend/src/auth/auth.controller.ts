import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/roles.decorator';
import { LoginDto, RefreshTokenDto, ChangePasswordDto } from './dto/auth.dto';
import { AuditAction } from '@prisma/client';

@ApiTags('Kimlik Doğrulama')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * POST /auth/login
   * E-posta + şifre ile giriş, JWT access + refresh token döner
   */
  @Public()
  @UseGuards(ThrottlerGuard, AuthGuard('local'))
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kullanıcı girişi', description: 'E-posta ve şifre ile giriş yapın' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Giriş başarılı, token çifti döner' })
  @ApiResponse({ status: 401, description: 'Geçersiz kimlik bilgileri' })
  @ApiResponse({ status: 429, description: 'Çok fazla başarısız giriş denemesi' })
  async login(
    @Request() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.login(req.user, ip, userAgent);
  }

  /**
   * POST /auth/refresh
   * Refresh token ile yeni access token al
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Token yenileme' })
  @ApiResponse({ status: 200, description: 'Yeni token çifti' })
  @ApiResponse({ status: 401, description: 'Geçersiz refresh token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.refreshTokens(dto.refreshToken, ip, userAgent);
  }

  /**
   * POST /auth/logout
   * Mevcut refresh token'ı iptal et
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Çıkış yap (mevcut oturum)' })
  async logout(
    @CurrentUser() user: any,
    @Body() dto: RefreshTokenDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    await this.authService.logout(user.id, user.tenantId, dto.refreshToken, ip, userAgent);
    return { message: 'Başarıyla çıkış yapıldı.' };
  }

  /**
   * POST /auth/logout-all
   * Tüm cihazlardan çıkış yap
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tüm oturumları kapat' })
  async logoutAll(
    @CurrentUser() user: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    await this.authService.logoutAll(user.id, user.tenantId, ip, userAgent);
    return { message: 'Tüm oturumlar başarıyla kapatıldı.' };
  }

  /**
   * GET /auth/me
   * Mevcut kullanıcı profili
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mevcut kullanıcı bilgisi' })
  @ApiResponse({ status: 200, description: 'Kullanıcı profili' })
  async me(@CurrentUser() user: any) {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      customerId: user.customerId,
    };
  }

  /**
   * POST /auth/change-password
   * Şifre değiştirme (mevcut şifre doğrulama zorunlu)
   */
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Şifre değiştir' })
  @ApiResponse({ status: 200, description: 'Şifre başarıyla değiştirildi' })
  @ApiResponse({ status: 401, description: 'Mevcut şifre hatalı' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    await this.authService.changePassword(
      user.id,
      user.tenantId,
      dto.currentPassword,
      dto.newPassword,
      ip,
      userAgent,
    );
    return { message: 'Şifreniz başarıyla değiştirildi. Lütfen tekrar giriş yapın.' };
  }
}
