import { Controller, Post, Get, Body, Param, Headers, UseGuards, HttpCode, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { IyzicoService } from './iyzico/iyzico.service';
import { IyzicoCallbackService } from './iyzico/iyzico-callback.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ClientJwtGuard } from '../client-portal/guards/client-jwt.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { Request } from 'express';

class SaveIyzicoSettingsDto {
  @IsString() @IsNotEmpty() apiKey: string;
  @IsString() @IsNotEmpty() secretKey: string;
  @IsOptional() @IsString() subMerchantType?: string;
}

@ApiTags('Odeme Sistemi - Iyzico Pazaryeri')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly iyzicoService: IyzicoService,
    private readonly callbackService: IyzicoCallbackService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(UserRole.SuperAdmin)
  @Post('iyzico/settings')
  @ApiOperation({ summary: 'Iyzico API Anahtarlarini Kaydet' })
  async saveSettings(@Body() dto: SaveIyzicoSettingsDto, @CurrentTenant() tenantId: string) {
    return { message: 'Iyzico ayarlari kaydedildi', tenantId };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(UserRole.SuperAdmin)
  @Post('iyzico/onboard')
  @ApiOperation({ summary: 'Iyzico Sub-Merchant Onboarding' })
  onboard(@CurrentTenant() tenantId: string) {
    return this.iyzicoService.onboardSubMerchant(tenantId);
  }

  @UseGuards(ClientJwtGuard)
  @Post('iyzico/checkout/:invoiceId')
  @ApiOperation({ summary: 'Fatura icin Iyzico Checkout Form Baslat' })
  initCheckout(@Param('invoiceId') invoiceId: string, @Req() req: any) {
    return this.iyzicoService.initializeCheckout(invoiceId, req.clientUser.tenantId, req.clientUser.contactId);
  }

  @Public()
  @Post('iyzico/callback')
  @HttpCode(200)
  @ApiOperation({ summary: 'Iyzico Odeme Sonuc Bildirimi - Webhook' })
  @ApiHeader({ name: 'iyzicoSignature', description: 'Iyzico HMAC imzasi', required: false })
  handleCallback(
    @Body() payload: Record<string, string>,
    @Headers('iyzicoSignature') signature: string,
  ) {
    return this.callbackService.handleCallback(payload, signature);
  }
}
