import { Controller, Post, Get, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { ReconciliationService } from './reconciliation.service';
import { SendReconciliationDto, RespondReconciliationDto } from './dto/reconciliation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('E-Mutabakat Sistemi')
@Controller('reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  // ─── Admin Endpoint'leri ────────────────────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(UserRole.Accountant, UserRole.SuperAdmin)
  @Post('send')
  @ApiOperation({ summary: 'Cariye Mutabakat E-postası Gönder (Magic Link ile)' })
  send(
    @Body() dto: SendReconciliationDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reconciliationService.sendReconciliation(dto, tenantId, userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(UserRole.Accountant, UserRole.SuperAdmin, UserRole.Auditor)
  @Get()
  @ApiOperation({ summary: 'Mutabakat Talepleri Listesi' })
  list(@CurrentTenant() tenantId: string) {
    return this.reconciliationService.list(tenantId);
  }

  // ─── Müşteri Endpoint'leri — JWT gerektirmez, token ile korunur ────────────

  @Public()
  @Get('verify')
  @ApiOperation({ summary: 'Mutabakat Tokenını Doğrula ve Bakiyeyi Göster (Müşteri — şifre gerekmez)' })
  @ApiQuery({ name: 'token', description: 'Magic link token' })
  verify(@Query('token') token: string) {
    return this.reconciliationService.verifyToken(token);
  }

  @Public()
  @Post('respond')
  @ApiOperation({ summary: 'Mutabakatı Onayla veya Reddet (IP ve zaman damgası loglanır)' })
  @ApiQuery({ name: 'token', description: 'Magic link token' })
  respond(
    @Query('token') token: string,
    @Body() dto: RespondReconciliationDto,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.connection?.remoteAddress
      || req.ip
      || 'unknown';

    return this.reconciliationService.respond(token, dto, ipAddress);
  }
}
