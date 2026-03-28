import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MarketplaceService, CreateConnectionDto } from './marketplace.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Pazaryeri Entegrasyonları (Trendyol, Hepsiburada, Amazon)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Roles(UserRole.SuperAdmin)
  @Post('connections')
  @ApiOperation({ summary: 'Yeni Pazaryeri Bağlantısı Ekle (API Key AES-256 ile şifrelenerek saklanır)' })
  createConnection(@CurrentTenant() tenantId: string, @Body() dto: CreateConnectionDto) {
    return this.marketplaceService.createConnection(tenantId, dto);
  }

  @Roles(UserRole.SuperAdmin, UserRole.Accountant, UserRole.Auditor)
  @Get('connections')
  @ApiOperation({ summary: 'Pazaryeri Bağlantılarını Listele (API keyleri gizlenir)' })
  getConnections(@CurrentTenant() tenantId: string) {
    return this.marketplaceService.getConnections(tenantId);
  }

  @Roles(UserRole.SuperAdmin)
  @Delete('connections/:id')
  @ApiOperation({ summary: 'Pazaryeri Bağlantısını Sil' })
  deleteConnection(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.marketplaceService.deleteConnection(id, tenantId);
  }

  @Roles(UserRole.SuperAdmin, UserRole.Accountant, UserRole.Auditor)
  @Get('orders')
  @ApiOperation({ summary: 'Tüm Pazaryeri Siparişlerini Listele' })
  getOrders(@CurrentTenant() tenantId: string) {
    return this.marketplaceService.getOrders(tenantId);
  }

  @Roles(UserRole.SuperAdmin, UserRole.Accountant)
  @Post('sync')
  @ApiOperation({ summary: 'Tüm Aktif Pazaryerleri Senkronize Et (Sipariş → Taslak Fatura)' })
  syncAll(@CurrentTenant() tenantId: string) {
    return this.marketplaceService.syncAll(tenantId);
  }

  @Roles(UserRole.SuperAdmin, UserRole.Accountant)
  @Post('connections/:id/sync')
  @ApiOperation({ summary: 'Belirli Pazaryeri Bağlantısını Senkronize Et' })
  syncOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.marketplaceService.syncOne(id, tenantId);
  }
}
