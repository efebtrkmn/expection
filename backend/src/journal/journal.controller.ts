import { Controller, Get, Post, Body, Param, Put, Patch, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JournalService } from './journal.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, JournalStatus } from '@prisma/client';

@ApiTags('Yevmiye Fişleri')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('journal')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Roles(UserRole.Accountant, UserRole.SuperAdmin)
  @Post()
  @ApiOperation({ summary: 'Manuel Yevmiye Fişi Oluştur', description: 'Borç - Alacak dökümlü manuel muhasebe fişi girer.' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateJournalDto,
  ) {
    // Manuel oluşturmalarda entryNumber biz de verebiliriz, ama güvenli olması için benzersiz bir prefix kullanalım.
    // DTO içine opsiyonel eklemiştik, yoksa biz yaratıyoruz.
    const payload = {
      ...dto,
      entryNumber: dto.entryDate ? `MV-${Date.now().toString().slice(-6)}` : `MV-${Date.now().toString().slice(-6)}`
    };
    
    // Geçici olarak bir entryNumber set edelim
    return this.journalService.postJournalEntry(
      { ...dto, entryNumber: `JV-${Date.now()}` } as any, // TS trick for dynamic entryNumber
      tenantId, 
      userId
    );
  }

  @Roles(UserRole.Accountant, UserRole.SuperAdmin, UserRole.Auditor)
  @Get()
  @ApiOperation({ summary: 'Tüm Yevmiye Fişlerini Listele' })
  findAll(@CurrentTenant() tenantId: string) {
    return this.journalService.findAll(tenantId);
  }

  @Roles(UserRole.Accountant, UserRole.SuperAdmin, UserRole.Auditor)
  @Get(':id')
  @ApiOperation({ summary: 'Yevmiye Fişi Detayını ve Muavin Satırlarını Getir' })
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.journalService.findOne(id, tenantId);
  }

  @Roles(UserRole.Accountant, UserRole.SuperAdmin)
  @Patch(':id/status')
  @ApiOperation({ summary: 'Yevmiye Fişi Durumunu Değiştir (POSTED / CANCELLED vb.)' })
  setStatus(
    @Param('id') id: string,
    @Body('status') status: JournalStatus,
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.journalService.setStatus(id, status, tenantId, userId);
  }
}
