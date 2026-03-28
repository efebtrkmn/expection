import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceCalculatorService } from './invoice-items.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvoiceStatus, AuditAction, InvoiceType } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: InvoiceCalculatorService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * Yeni Fatura ve Kalemlerini Hesaplayarak, Transaction İçerisinde Veritabanına Yazar
   */
  async create(tenantId: string, userId: string, dto: CreateInvoiceDto) {
    // 1. Matematiksel Fatura Kalem Analizi (Decimal.js üzerinden Kusursuz Hesaplama)
    const { calculatedItems, totals } = this.calculator.calculateItems(dto.items);

    // Müşteri / Tedarikçi Kontrolü
    const customer = await this.prisma.customerSupplier.findFirst({
      where: { id: dto.customerSupplierId, tenantId },
    });
    if (!customer) throw new BadRequestException('Böyle bir müşteri/tedarikçi bulunamadı');

    return this.prisma.withTenantTransaction(tenantId, async (tx) => {
      // 2. Fatura Başlığını (Header) DB'ye Oluştur
      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          customerSupplierId: dto.customerSupplierId,
          invoiceNumber: dto.invoiceNumber,
          type: dto.type,
          status: InvoiceStatus.DRAFT, // Fatura baştan taslak gelir
          issueDate: new Date(dto.issueDate),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          currency: dto.currency || 'TRY',
          exchangeRate: dto.exchangeRate || 1.0,
          originalCurrency: dto.currency || 'TRY',
          notes: dto.notes,
          
          // Önceden hesaplanıp yuvarlanmış kusursuz net ve vergi değerlerini koy
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          taxAmount: totals.taxAmount,
          withholdingTotal: totals.withholdingTotal,
          totalAmount: totals.totalAmount,
          createdById: userId,

          // 3. Fiş Kalemlerini İlişkisel Olarak Yarat
          items: {
            create: calculatedItems.map((item) => ({
              tenantId,
              productId: item.productId,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              discountRate: item.discountRate,
              discountAmount: item.discountAmount,
              taxRate: item.taxRate,
              withholdingRate: item.withholdingRate,
              lineSubtotal: item.lineSubtotal,
              lineTax: item.lineTax,
              lineWithholding: item.lineWithholding,
              lineTotal: item.lineTotal,
              currency: dto.currency || 'TRY',
              exchangeRate: dto.exchangeRate || 1.0,
            })),
          },
        },
        include: { items: true },
      });

      // 4. Denetim Günlüğü (Audit Log)
      await this.auditLog.logEntityChange({
        tenantId,
        userId,
        action: AuditAction.CREATE,
        entityType: 'invoice',
        entityId: invoice.id,
        newValues: invoice,
      });

      this.logger.log(`Invoice DRAFT created: ${invoice.invoiceNumber}. Total: ${totals.totalAmount}`);

      return invoice;
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.invoice.findMany({
      where: { tenantId },
      include: { customerSupplier: { select: { name: true, taxNumber: true } } },
      orderBy: { issueDate: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        items: { include: { product: true } },
        customerSupplier: true,
        expenseJournal: true, // Eğer Post edilmişse Yevmiyesini göster
      },
    });
    if (!invoice) throw new NotFoundException('Fatura bulunamadı');
    return invoice;
  }

  /**
   * Fatura Taslaktan (DRAFT) -> Kesildi (ISSUED/POSTED) durumuna geçer.
   * Bu Event fırlatıldığında iki kritik şey otomatik çalışır:
   * 1. Stoklar WebSocket uyarılarıyla düşer.
   * 2. Yeni yevmiye kaydı Tekdüzen (100, 120, 600, 391) uyarınca atılır.
   */
  async postInvoice(id: string, tenantId: string, userId: string) {
    const invoice = await this.findOne(id, tenantId);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Hata: Yalnızca TASLAK halindeki faturalar resmileştirilebilir (POST).');
    }

    const posted = await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.ISSUED },
      include: { items: true, customerSupplier: true }
    });

    // SISTEMI EVENT-DRIVEN OLARAK TETIKLE
    this.eventEmitter.emit('invoice.posted', {
      tenantId,
      userId,
      invoice: posted,
    });

    this.logger.log(`Invoice POSTED: ${invoice.invoiceNumber}. Event emitted to Journal & Stock Listeners.`);

    await this.auditLog.logEntityChange({
      tenantId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'invoice_post',
      entityId: posted.id,
      oldValues: { status: invoice.status },
      newValues: { status: posted.status },
    });

    return posted;
  }
}
