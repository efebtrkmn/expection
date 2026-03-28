import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Fatura ve İrsaliye Yönetimi')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Roles(UserRole.Accountant, UserRole.SuperAdmin)
  @Post()
  @ApiOperation({ summary: 'Yeni Taslak Fatura Oluştur' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoicesService.create(tenantId, userId, dto);
  }

  @Roles(UserRole.Accountant, UserRole.Auditor, UserRole.SuperAdmin)
  @Get()
  @ApiOperation({ summary: 'Tüm Faturaları Listele' })
  findAll(@CurrentTenant() tenantId: string) {
    return this.invoicesService.findAll(tenantId);
  }

  @Roles(UserRole.Accountant, UserRole.Auditor, UserRole.SuperAdmin)
  @Get(':id')
  @ApiOperation({ summary: 'Fatura Detayını (Kalemleriyle) Getir' })
  findOne(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.invoicesService.findOne(id, tenantId);
  }

  @Roles(UserRole.Accountant, UserRole.SuperAdmin)
  @Patch(':id/post')
  @ApiOperation({ summary: 'Faturayı Resmileştir (Stok düşer, yevmiye atar, WebSocket alarm yollar)' })
  postInvoice(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.invoicesService.postInvoice(id, tenantId, userId);
  }
}
