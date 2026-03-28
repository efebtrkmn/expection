import { Controller, Get, Query, UseGuards, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { BabsService } from './babs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Raporlar ve Finans Merkezi')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly babsService: BabsService,
  ) {}

  @Roles(UserRole.SuperAdmin, UserRole.Accountant, UserRole.Auditor)
  @Get('dashboard')
  @ApiOperation({ summary: 'Ana Sayfa Finansal Özet Tablosu' })
  @ApiQuery({ name: 'start', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'end', required: false, description: 'YYYY-MM-DD' })
  getDashboard(
    @CurrentTenant() tenantId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const periodStart = start ? new Date(start) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const periodEnd = end ? new Date(end) : new Date();
    return this.reportsService.getDashboardSummary(tenantId, periodStart, periodEnd);
  }

  @Roles(UserRole.SuperAdmin, UserRole.Accountant, UserRole.Auditor)
  @Get('profit-loss/:year')
  @ApiOperation({ summary: 'Aylık Gelir Tablosu (Kâr/Zarar) - Chart.js Jsonu' })
  getProfitAndLoss(
    @CurrentTenant() tenantId: string,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return this.reportsService.getProfitAndLoss(tenantId, year);
  }

  @Roles(UserRole.SuperAdmin, UserRole.Accountant, UserRole.Auditor)
  @Get('trial-balance')
  @ApiOperation({ summary: 'Genel Geçici Mizan (Hesap Planı Bakiyeleri)' })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD' })
  getTrialBalance(
    @CurrentTenant() tenantId: string,
    @Query('date') date?: string,
  ) {
    const asOfDate = date ? new Date(date) : new Date();
    return this.reportsService.getTrialBalance(tenantId, asOfDate);
  }

  @Roles(UserRole.SuperAdmin, UserRole.Accountant, UserRole.Auditor)
  @Get('babs/:period')
  @ApiOperation({ summary: 'VUK 148 Kapsamında Ba ve Bs Bildirim Form Listeleri (>5000TL)' })
  async getBabsForms(
    @CurrentTenant() tenantId: string,
    @Param('period') period: string, // YYYY-MM
  ) {
    const ba = await this.babsService.getBaList(tenantId, period);
    const bs = await this.babsService.getBsList(tenantId, period);

    return {
      period,
      baFormInfo: { totalListed: Array.isArray(ba) ? ba.length : 0, data: ba },
      bsFormInfo: { totalListed: Array.isArray(bs) ? bs.length : 0, data: bs },
    };
  }
}
