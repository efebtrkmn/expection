import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BankingService, CreateBankAccountDto } from './banking.service';
import { ReconciliationService } from './reconciliation.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Açık Bankacılık ve Mutabakat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('banking')
export class BankingController {
  constructor(
    private readonly bankingService: BankingService,
    private readonly reconciliationService: ReconciliationService,
  ) {}

  @Roles(UserRole.Accountant, UserRole.SuperAdmin)
  @Post('accounts')
  @ApiOperation({ summary: 'Yeni Banka Hesabı Ekle' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateBankAccountDto) {
    return this.bankingService.create(tenantId, dto);
  }

  @Roles(UserRole.Accountant, UserRole.SuperAdmin, UserRole.Auditor)
  @Get('accounts')
  @ApiOperation({ summary: 'Banka Hesaplarını Listele' })
  findAll(@CurrentTenant() tenantId: string) {
    return this.bankingService.findAll(tenantId);
  }

  @Roles(UserRole.Accountant, UserRole.SuperAdmin, UserRole.Auditor)
  @Get('accounts/:id/transactions')
  @ApiOperation({ summary: 'Banka Hareketlerini Listele' })
  getTransactions(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.bankingService.getTransactions(id, tenantId);
  }

  @Roles(UserRole.Accountant, UserRole.SuperAdmin)
  @Post('accounts/:id/sync')
  @ApiOperation({ summary: 'Banka Hesabını Manuel Senkronize Et (KolayBi API)' })
  sync(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.bankingService.manualSync(id, tenantId);
  }

  @Roles(UserRole.Accountant, UserRole.SuperAdmin, UserRole.Auditor)
  @Get('reconciliation')
  @ApiOperation({ summary: 'Eşleşmemiş Banka Hareketleri Listesi' })
  getUnmatched(@CurrentTenant() tenantId: string) {
    return this.reconciliationService.getUnmatchedTransactions(tenantId);
  }

  @Roles(UserRole.Accountant, UserRole.SuperAdmin)
  @Post('reconciliation/:txId/match/:invoiceId')
  @ApiOperation({ summary: 'Banka Hareketi ile Faturayı Manuel Eşleştir → Fatura PAID yapılır' })
  manualMatch(
    @Param('txId') txId: string,
    @Param('invoiceId') invoiceId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.reconciliationService.manualMatch(txId, invoiceId, tenantId);
  }
}
