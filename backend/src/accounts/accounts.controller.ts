import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  UseGuards,
  Ip
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/create-account.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Hesap Planı (Accounts)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @Roles(UserRole.Accountant, UserRole.Auditor)
  @ApiOperation({ summary: 'Hesap planını listele' })
  findAll(@CurrentTenant() tenantId: string) {
    return this.accountsService.findAll(tenantId);
  }

  @Get(':id')
  @Roles(UserRole.Accountant, UserRole.Auditor)
  @ApiOperation({ summary: 'Hesap detayını getir' })
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.accountsService.findOne(id, tenantId);
  }

  @Post()
  @Roles(UserRole.Accountant, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Yeni hesap oluştur' })
  create(
    @Body() dto: CreateAccountDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Ip() ip: string,
  ) {
    return this.accountsService.create(dto, tenantId, userId, ip);
  }

  @Put(':id')
  @Roles(UserRole.Accountant, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Hesabı güncelle' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Ip() ip: string,
  ) {
    return this.accountsService.update(id, dto, tenantId, userId, ip);
  }

  @Delete(':id')
  @Roles(UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Hesabı sil (Sadece SuperAdmin, Hareketsiz ise)' })
  delete(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Ip() ip: string,
  ) {
    return this.accountsService.delete(id, tenantId, userId, ip);
  }
}
