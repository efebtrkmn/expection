import {
  Controller, Get, Post, Param, Body, Headers, Res,
  UseGuards, RawBodyRequest, Req, HttpCode
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { EInvoiceService } from './e-invoice.service';
import { EInvoiceWebhookDto } from './dto/webhook-payload.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('e-Fatura (GİB UBL-TR)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('e-invoice')
export class EInvoiceController {
  constructor(private readonly eInvoiceService: EInvoiceService) {}

  @Roles(UserRole.Accountant, UserRole.SuperAdmin)
  @Post(':invoiceId/send')
  @ApiOperation({ summary: 'Faturayı GİB\'e gönder (UBL-TR XML → Base64 → Entegratör)' })
  sendInvoice(
    @Param('invoiceId') invoiceId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.eInvoiceService.sendInvoice(invoiceId, tenantId, userId);
  }

  @Roles(UserRole.Accountant, UserRole.SuperAdmin, UserRole.Auditor)
  @Get(':invoiceId/status')
  @ApiOperation({ summary: 'GİB\'teki güncel e-fatura durumunu sorgula' })
  queryStatus(
    @Param('invoiceId') invoiceId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.eInvoiceService.queryStatus(invoiceId, tenantId);
  }

  @Roles(UserRole.Accountant, UserRole.SuperAdmin, UserRole.Auditor)
  @Get(':invoiceId/xml')
  @ApiOperation({ summary: 'Üretilen UBL-TR XML\'i görüntüle (Ham XML output)' })
  async getXml(
    @Param('invoiceId') invoiceId: string,
    @CurrentTenant() tenantId: string,
    @Res() res: Response,
  ) {
    const xml = await this.eInvoiceService.getXml(invoiceId, tenantId);
    res.header('Content-Type', 'application/xml');
    return res.send(xml);
  }

  /**
   * Entegratörden gelen webhook — JWT guard'dan muaf (Public)
   * Güvenlik: HMAC-SHA256 imza doğrulaması ile korunur
   */
  @Public()
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Özel Entegratör Webhook Alıcısı (GİB durum güncellemeleri)' })
  @ApiHeader({ name: 'X-Integrator-Signature', description: 'HMAC-SHA256 imzası', required: true })
  async handleWebhook(
    @Body() dto: EInvoiceWebhookDto,
    @Headers('x-integrator-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody = (req.rawBody && req.rawBody.toString()) || JSON.stringify(dto);
    return this.eInvoiceService.handleWebhook(dto, rawBody, signature || '');
  }
}
