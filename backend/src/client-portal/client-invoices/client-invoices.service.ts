import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from 'decimal.js';
import { InvoiceStatus } from '@prisma/client';

@Injectable()
export class ClientInvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Müşterinin yalnızca kendi faturalarını listeler
   * contactId = customerSupplierId → katı izolasyon
   */
  async getMyInvoices(contactId: string, tenantId: string) {
    return this.prisma.invoice.findMany({
      where: {
        tenantId,
        customerSupplierId: contactId,    // ← Kritik filtre
        status: { not: InvoiceStatus.DRAFT }, // Taslak faturalar gösterilmez
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

  /**
   * Fatura detayı — contactId sahiplik doğrulaması zorunlu
   */
  async getMyInvoiceDetail(invoiceId: string, contactId: string, tenantId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { items: true },
    });

    if (!invoice) throw new NotFoundException('Fatura bulunamadı');

    // Müşteri başka birinin faturasına erişmeye çalışıyor mu?
    if (invoice.customerSupplierId !== contactId) {
      throw new ForbiddenException('Bu faturaya erişim yetkiniz bulunmuyor.');
    }

    return invoice;
  }

  /**
   * Müşterinin özet bakiyesi (Dashboard)
   */
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
}
