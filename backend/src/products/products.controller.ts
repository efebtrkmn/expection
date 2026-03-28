import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Stok ve Ürün Yönetimi')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Roles(UserRole.Accountant, UserRole.SuperAdmin)
  @Post()
  @ApiOperation({ summary: 'Yeni Stok/Hizmet Kartı Oluştur' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(tenantId, userId, dto);
  }

  @Roles(UserRole.Accountant, UserRole.SuperAdmin, UserRole.Auditor)
  @Get()
  @ApiOperation({ summary: 'Tüm Ürün/Hizmetleri Listele (Arama yapılabilir)' })
  @ApiQuery({ name: 'search', required: false, description: 'Ürün adı veya kodu' })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('search') search?: string,
  ) {
    return this.productsService.findAll(tenantId, search);
  }

  @Roles(UserRole.Accountant, UserRole.SuperAdmin, UserRole.Auditor)
  @Get('low-stock')
  @ApiOperation({ summary: 'Kritik Stok Seviyesinin Altındaki Ürünleri Listele' })
  getLowStock(@CurrentTenant() tenantId: string) {
    return this.productsService.getLowStockProducts(tenantId);
  }

  @Roles(UserRole.Accountant, UserRole.SuperAdmin, UserRole.Auditor)
  @Get(':id')
  @ApiOperation({ summary: 'Stok Kartı Detayı Getir' })
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.productsService.findOne(id, tenantId);
  }

  @Roles(UserRole.Accountant, UserRole.SuperAdmin)
  @Patch(':id')
  @ApiOperation({ summary: 'Stok Kartı Güncelle' })
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, tenantId, userId, dto);
  }

  @Roles(UserRole.Accountant, UserRole.SuperAdmin)
  @Delete(':id')
  @ApiOperation({ summary: 'Stok Kartı Sil (Pasife Al)' })
  remove(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.remove(id, tenantId, userId);
  }
}
