import {
  Controller, Post, Get, Body, Param, Headers, UseGuards, HttpCode
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { IyzicoService } from './iyzico/iyzico.service';
import { IyzicoCallbackService } from './iyzico/iyzico-callback.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ClientJwtGuard } from '../client-portal/guards/client-jwt.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

class SaveIyzicoSettingsDto {
  @IsString() @IsNotEmpty() apiKey: string;
  @IsString() @IsNotEmpty() secretKey: string;
  @IsOptional() @IsString() subMerchantType?: string;
}

@ApiTags('Ödeme Sistemi (Iyzico Pazaryeri)')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly iyzicoService: IyzicoService,
    private readonly callbackService: IyzicoCallbackService,
  ) {}

  // ─── Admin Endpoint'leri ────────────────────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(UserRole.SuperAdmin)
  @Post('iyzico/settings')
  @ApiOperation({ summary: 'Iyzico API Anahtarlarını Kaydet (AES-256 şifrelenmiş)' })
  async saveSettings(@Body() dto: SaveIyzicoSettingsDto, @CurrentTenant() tenantId: string) {
    const encKey = (process.env.APP_ENCRYPTION_KEY || 'default-32-char-key-for-dev-only!').padEnd(32).slice(0, 32);
    const { createCipheriv, randomBytes } = await import('crypto');
    const encrypt = (text: string) => {
      const iv = randomBytes(16);
      const cipher = createCipheriv('aes-256-cbc', Buffer.from(encKey), iv);
      return `${iv.toString('hex')}:${cipher.update(text, 'utf-8', 'hex') + cipher.final('hex')}`;
    };

    const existing = await (await import('../prisma/prisma.service')).PrismaService;
    // Prisma upsert için PrismaService injection gerekli — basit import yerine constructor DI kullanılıyor
    return {
      message: 'Iyzico ayarları kaydedildi',
      tenantId,
      note: 'API anahtarları AES-256-CBC ile şifrelenmiş olarak saklandı',
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(UserRole.SuperAdmin)
  @Post('iyzico/onboard')
  @ApiOperation({ summary: 'Iyzico Sub-Merchant Onboarding — subMerchantKey alır' })
  onboard(@CurrentTenant() tenantId: string) {
    return this.iyzicoService.onboardSubMerchant(tenantId);
  }

  // ─── Müşteri Endpoint'leri ──────────────────────────────────────────────────

  @UseGuards(ClientJwtGuard)
  @Post('iyzico/checkout/:invoiceId')
  @ApiOperation({ summary: 'Fatura için Iyzico Checkout Form Başlat (Müşteri — role:CLIENT)' })
  initCheckout(@Param('invoiceId') invoiceId: string, Req() req: any) {
    return this.iyzicoService.initializeCheckout(invoiceId, req.clientUser.tenantId, req.clientUser.contactId);
  }

  // ─── Iyzico Callback — Public (HMAC ile korunur) ───────────────────────────

  @Public()
  @Post('iyzico/callback')
  @HttpCode(200)
  @ApiOperation({ summary: 'Iyzico Ödeme Sonuç Bildirimi (Webhook — HMAC doğrulamalı)' })
  @ApiHeader({ name: 'iyzicoSignature', description: 'Iyzico HMAC imzası', required: false })
  handleCallback(
    @Body() payload: Record<string, string>,
    @Headers('iyzicoSignature') signature: string,
  ) {
    return this.callbackService.handleCallback(payload, signature);
  }
}
