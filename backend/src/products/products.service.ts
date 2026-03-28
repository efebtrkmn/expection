import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '@prisma/client';
import { Decimal } from 'decimal.js';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(tenantId: string, userId: string, dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: {
        tenantId_code: { tenantId, code: dto.code }
      }
    });

    if (existing) {
      throw new ConflictException(`Bu stok kodu (${dto.code}) zaten sistemde mevcut.`);
    }

    const product = await this.prisma.product.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        unit: dto.unit,
        unitPrice: dto.unitPrice,
        taxRate: dto.taxRate,
        stockQuantity: dto.stockQuantity || 0,
        criticalStockLevel: dto.criticalStockLevel || null,
        trackStock: dto.trackStock ?? true,
        salesAccountCode: dto.salesAccountCode || '600',
        cogsAccountCode: dto.cogsAccountCode || '620',
        isActive: dto.isActive ?? true,
      }
    });

    await this.auditLog.logEntityChange({
      tenantId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'product',
      entityId: product.id,
      newValues: product,
    });

    return product;
  }

  async findAll(tenantId: string, search?: string) {
    const whereClause: any = { tenantId };
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } }
      ];
    }

    return this.prisma.product.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId }
    });
    
    if (!product) throw new NotFoundException('Ürün/Hizmet bulunamadı');
    return product;
  }

  async update(id: string, tenantId: string, userId: string, dto: UpdateProductDto) {
    const product = await this.findOne(id, tenantId);

    const updated = await this.prisma.product.update({
      where: { id },
      data: dto
    });

    await this.auditLog.logEntityChange({
      tenantId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'product',
      entityId: product.id,
      oldValues: product,
      newValues: updated,
    });

    return updated;
  }

  async remove(id: string, tenantId: string, userId: string) {
    const product = await this.findOne(id, tenantId);

    // TODO: Faturada kullanılmış ürün varsa tamamen silinmesi engellenmeli
    // Şimdilik isActive flag over-ride yapıyor
    
    await this.prisma.product.delete({
      where: { id }
    });

    await this.auditLog.logEntityChange({
      tenantId,
      userId,
      action: AuditAction.DELETE,
      entityType: 'product',
      entityId: product.id,
      oldValues: product,
    });

    return { success: true };
  }

  /**
   * Bir fatura "POSTED" durumuna geldiğinde stok düşümlerini yapar.
   * İzleme (trackStock) flag'i aktifse günceller.
   * Stok kritik seviyenin altına inerse global bir Event fırlatarak WebSocket modülünü uyarır.
   */
  async reduceStockLevels(tenantId: string, items: Array<{ productId: string, quantity: number }>) {
    for (const item of items) {
      if (!item.productId) continue; // Serbest kalem

      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, tenantId }
      });

      if (product && product.trackStock) {
        const newStock = new Decimal(product.stockQuantity).minus(item.quantity);
        
        await this.prisma.product.update({
          where: { id: product.id },
          data: { stockQuantity: newStock.toNumber() }
        });

        this.logger.log(`Stock reduced: ${product.name} (ID: ${product.id}) - New Balance: ${newStock.toNumber()}`);

        // Kritik stok kontrolü yapıp WebSocket/Alarm eventini tetikle
        if (product.criticalStockLevel !== null && newStock.lessThanOrEqualTo(product.criticalStockLevel)) {
          this.eventEmitter.emit('stock.alert', {
            tenantId,
            productId: product.id,
            productName: product.name,
            currentStock: newStock.toNumber(),
            criticalLevel: product.criticalStockLevel.toNumber()
          });
        }
      }
    }
  }

  /**
   * Sadece kritik stok seviyesinin altında olanları listeler (Dashboard / Sipariş listesi için)
   */
  async getLowStockProducts(tenantId: string) {
    // Prisma Decimal field comparison
    return this.prisma.$queryRaw`
      SELECT id, code, name, stock_quantity as "stockQuantity", critical_stock_level as "criticalStockLevel"
      FROM products
      WHERE tenant_id = ${tenantId}::uuid
        AND track_stock = true
        AND critical_stock_level IS NOT NULL
        AND stock_quantity <= critical_stock_level
      ORDER BY stock_quantity ASC
    `;
  }
}
