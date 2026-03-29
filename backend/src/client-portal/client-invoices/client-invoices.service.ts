import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from 'decimal.js';
import { InvoiceStatus } from '@prisma/client';

@Injectable()
export class ClientInvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyInvoices(contactId: string, tenantId: string) {
    return this.prisma.invoice.findMany({
      where: {
        tenantId,
        customerSupplierId: contactId,
      },
      select: {
        id: true,
        invoiceNumber: true,
        issueDate: true,
        dueDate: true,
        totalAmount: true,
        currency: true,
        status: true,
        eInvoiceStatus: true,
      },
      orderBy: { issueDate: 'desc' },
    });
  }

  async getMyInvoiceDetail(invoiceId: string, contactId: string, tenantId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { items: true },
    });

    if (!invoice) throw new NotFoundException('Fatura bulunamadı');
    if (invoice.customerSupplierId !== contactId) {
      throw new ForbiddenException('Bu faturaya erişim yetkiniz bulunmuyor.');
    }

    return invoice;
  }

  async getMySummary(contactId: string, tenantId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, customerSupplierId: contactId, status: { not: InvoiceStatus.DRAFT } },
      select: { totalAmount: true, status: true, dueDate: true },
    });

    const totalDebt = invoices
      .filter(i => i.status === InvoiceStatus.ISSUED || i.status === InvoiceStatus.SENT || i.status === InvoiceStatus.OVERDUE)
      .reduce((sum, i) => sum.plus(i.totalAmount), new Decimal(0));

    const overdue = invoices
      .filter(i => i.dueDate && new Date(i.dueDate) < new Date() && i.status !== InvoiceStatus.PAID)
      .reduce((sum, i) => sum.plus(i.totalAmount), new Decimal(0));

    const paid = invoices
      .filter(i => i.status === InvoiceStatus.PAID)
      .reduce((sum, i) => sum.plus(i.totalAmount), new Decimal(0));

    return {
      totalDebt: totalDebt.toNumber(),
      overdueAmount: overdue.toNumber(),
      totalPaid: paid.toNumber(),
      invoiceCount: invoices.length,
    };
  }

  async createInvoice(
    contactId: string,
    tenantId: string,
    dto: {
      invoiceNumber: string;
      type: string;
      issueDate: string;
      dueDate?: string;
      currency?: string;
      notes?: string;
      items: {
        description: string;
        quantity: number;
        unit?: string;
        unitPrice: number;
        discountRate?: number;
        taxRate?: number;
      }[];
    },
  ) {
    let subtotal = new Decimal(0);
    let totalTax = new Decimal(0);

    const itemsData = dto.items.map((item) => {
      const lineSubtotal = new Decimal(item.quantity).times(item.unitPrice);
      const discount = lineSubtotal.times(item.discountRate || 0).dividedBy(100);
      const afterDiscount = lineSubtotal.minus(discount);
      const tax = afterDiscount.times(item.taxRate ?? 20).dividedBy(100);
      const lineTotal = afterDiscount.plus(tax);

      subtotal = subtotal.plus(afterDiscount);
      totalTax = totalTax.plus(tax);

      return {
        description: item.description,
        quantity: item.quantity,
        unit: (item.unit as any) || 'ADET',
        unitPrice: item.unitPrice,
        discountRate: item.discountRate || 0,
        taxRate: item.taxRate ?? 20,
        lineSubtotal: afterDiscount.toNumber(),
        lineTax: tax.toNumber(),
        lineTotal: lineTotal.toNumber(),
        withholdingRate: 0,
        lineWithholding: 0,
      };
    });

    const totalAmount = subtotal.plus(totalTax);

    // Client portal users are NOT in the User table, so we need a valid User UUID
    // for the createdById FK constraint. Use the first admin user of the tenant.
    const tenantUser = await this.prisma.user.findFirst({
      where: { tenantId },
      select: { id: true },
    });
    if (!tenantUser) {
      throw new NotFoundException('Tenant kullanıcısı bulunamadı. Fatura oluşturulamaz.');
    }

    try {
      return await this.prisma.invoice.create({
        data: {
          tenantId,
          customerSupplierId: contactId,
          createdById: tenantUser.id,
          invoiceNumber: dto.invoiceNumber,
          type: dto.type || 'SALES',
          status: 'DRAFT',
          issueDate: new Date(dto.issueDate),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          currency: dto.currency || 'TRY',
          exchangeRate: 1,
          subtotal: subtotal.toNumber(),
          taxAmount: totalTax.toNumber(),
          totalAmount: totalAmount.toNumber(),
          notes: dto.notes,
          items: {
            create: itemsData.map((item) => ({
              ...item,
              tenantId,
            })),
          },
        } as any,
        include: { items: true },
      });
    } catch (err) {
      console.error('[CLIENT_INVOICE_CREATE_ERROR]', err);
      throw err;
    }
  }

  async deleteInvoice(invoiceId: string, contactId: string, tenantId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) throw new NotFoundException('Fatura bulunamadı');
    if (invoice.customerSupplierId !== contactId) {
      throw new ForbiddenException('Bu faturaya erişim yetkiniz bulunmuyor.');
    }
    if (invoice.status !== 'DRAFT') {
      throw new ForbiddenException('Sadece taslak faturalar silinebilir.');
    }

    await this.prisma.invoiceItem.deleteMany({ where: { invoiceId } });
    await this.prisma.invoice.delete({ where: { id: invoiceId } });

    return { success: true, message: 'Fatura silindi' };
  }
}
