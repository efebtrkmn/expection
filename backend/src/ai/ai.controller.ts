import { Controller, Post, Get, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AiClassificationService } from './ai-classification.service';
import { AiApprovalService } from './ai-approval.service';
import { ClassifyExpenseDto, ReviewClassificationDto } from './dto/classify-expense.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, AiClassificationStatus } from '@prisma/client';

@ApiTags('Yapay Zeka — Gider Sınıflandırma ve Onay Kuyruğu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly classificationService: AiClassificationService,
    private readonly approvalService: AiApprovalService,
  ) {}

  @Roles(UserRole.Accountant, UserRole.SuperAdmin)
  @Post('classify')
  @ApiOperation({ summary: 'Metin Sınıflandır → Gemini 1.5 Flash ile THP Hesap Önerisi' })
  classify(
    @Body() dto: ClassifyExpenseDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.classificationService.classify(dto, tenantId, userId);
  }

  @Roles(UserRole.Accountant, UserRole.SuperAdmin)
  @Post('classify/bank-tx/:id')
  @ApiOperation({ summary: 'Banka Hareketi Otomatik Sınıflandır' })
  classifyBankTx(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.classificationService.classifyBankTransaction(id, tenantId, userId);
  }

  @Roles(UserRole.Accountant, UserRole.SuperAdmin, UserRole.Auditor)
  @Get('queue')
  @ApiOperation({ summary: 'AI Onay Kuyruğunu Listele' })
  @ApiQuery({ name: 'status', enum: AiClassificationStatus, required: false })
  getQueue(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: AiClassificationStatus,
  ) {
    return this.approvalService.getQueue(tenantId, status);
  }

  @Roles(UserRole.Accountant, UserRole.SuperAdmin, UserRole.Auditor)
  @Get('queue/stats')
  @ApiOperation({ summary: 'AI Doğruluk ve Otomasyon İstatistikleri' })
  getStats(@CurrentTenant() tenantId: string) {
    return this.classificationService.getStats(tenantId);
  }

  @Roles(UserRole.Accountant, UserRole.SuperAdmin)
  @Post('queue/:id/approve')
  @ApiOperation({ summary: 'AI Önerisini İnsan Onayıyla Kabul Et (Yevmiye oluşturulur)' })
  approve(
    @Param('id') id: string,
    @Body() dto: ReviewClassificationDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.approvalService.approve(id, tenantId, userId, dto);
  }

  @Roles(UserRole.Accountant, UserRole.SuperAdmin)
  @Post('queue/:id/reject')
  @ApiOperation({ summary: 'AI Önerisini Reddet' })
  reject(
    @Param('id') id: string,
    @Body() dto: ReviewClassificationDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.approvalService.reject(id, tenantId, userId, dto);
  }
}
