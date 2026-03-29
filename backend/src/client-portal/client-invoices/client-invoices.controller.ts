import { Controller, Get, Post, Delete, Param, Body, Res, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { ClientInvoicesService } from './client-invoices.service';
import { ClientStatementService } from '../client-statement/client-statement.service';
import { ClientJwtGuard } from '../guards/client-jwt.guard';
import { Public } from '../../common/decorators/roles.decorator';
import { SkipTenantCheck } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Musteri Portali')
@Public()
@SkipTenantCheck()
@UseGuards(ClientJwtGuard)
@Controller('client')
export class ClientInvoicesController {
  constructor(
    private readonly invoicesService: ClientInvoicesService,
    private readonly statementService: ClientStatementService,
    private readonly prisma: PrismaService,
  ) { }

  @Get('summary')
  @ApiOperation({ summary: 'Musteri Bakiye Ozeti' })
  getSummary(@Req() req: any) {
    return this.invoicesService.getMySummary(req.clientUser.contactId, req.clientUser.tenantId);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Kendi Faturalarim' })
  getInvoices(@Req() req: any) {
    return this.invoicesService.getMyInvoices(req.clientUser.contactId, req.clientUser.tenantId);
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Fatura Detayi' })
  getInvoiceDetail(@Param('id') id: string, @Req() req: any) {
    return this.invoicesService.getMyInvoiceDetail(id, req.clientUser.contactId, req.clientUser.tenantId);
  }

  @Post('invoices')
  @ApiOperation({ summary: 'Yeni Fatura Olustur (Taslak)' })
  async createInvoice(@Body() dto: any, @Req() req: any, @Res() res: Response) {
    try {
      const result = await this.invoicesService.createInvoice(req.clientUser.contactId, req.clientUser.tenantId, dto);
      return res.status(201).json(result);
    } catch (err: any) {
      console.error('[CLIENT_INVOICE_CREATE_ERROR]', err?.message, err?.meta, err?.code);
      return res.status(400).json({
        statusCode: 400,
        message: err?.message || 'Fatura oluşturulamadı',
        detail: err?.meta?.cause || err?.meta?.target || err?.code || null,
      });
    }
  }

  @Delete('invoices/:id')
  @ApiOperation({ summary: 'Taslak Fatura Sil' })
  deleteInvoice(@Param('id') id: string, @Req() req: any) {
    return this.invoicesService.deleteInvoice(id, req.clientUser.contactId, req.clientUser.tenantId);
  }

  @Get('statement/pdf')
  @ApiOperation({ summary: 'Cari Ekstre PDF Indir' })
  async downloadPdf(@Req() req: any, @Res() res: Response) {
    const pdf = await this.statementService.generateStatementPdf(
      req.clientUser.contactId,
      req.clientUser.tenantId,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ekstre_${Date.now()}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }

  // ======================== PRODUCTS ========================

  @Get('products')
  @ApiOperation({ summary: 'Urunleri Listele' })
  async getProducts(@Req() req: any, @Query('search') search?: string) {
    const where: any = { tenantId: req.clientUser.tenantId, isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  @Post('products')
  @ApiOperation({ summary: 'Yeni Urun Ekle' })
  async createProduct(@Body() dto: any, @Req() req: any, @Res() res: Response) {
    try {
      const result = await this.prisma.product.create({
        data: {
          tenantId: req.clientUser.tenantId,
          code: dto.code,
          name: dto.name,
          description: dto.description || null,
          unit: dto.unit || 'ADET',
          unitPrice: dto.unitPrice || 0,
          taxRate: dto.taxRate ?? 20,
          stockQuantity: dto.stockQuantity || 0,
          criticalStockLevel: dto.criticalStockLevel || 5,
          trackStock: dto.trackStock ?? true,
        } as any,
      });
      return res.status(201).json(result);
    } catch (err: any) {
      console.error('[CLIENT_PRODUCT_CREATE_ERROR]', err?.message);
      return res.status(400).json({
        statusCode: 400,
        message: err?.message || 'Ürün oluşturulamadı',
      });
    }
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Urun Sil' })
  async deleteProduct(@Param('id') id: string, @Req() req: any) {
    await this.prisma.product.updateMany({
      where: { id, tenantId: req.clientUser.tenantId },
      data: { isActive: false },
    });
    return { success: true, message: 'Ürün pasife alındı' };
  }

  // ======================== TRANSACTIONS (Gelir/Gider) ========================

  @Get('transactions')
  @ApiOperation({ summary: 'Gelir/Gider Islemlerini Listele' })
  async getTransactions(@Req() req: any) {
    return this.prisma.transaction.findMany({
      where: { tenantId: req.clientUser.tenantId },
      include: {
        customerSupplier: {
          select: { id: true, name: true, type: true }
        }
      },
      orderBy: { transactionDate: 'desc' },
      take: 100,
    });
  }

  @Post('transactions')
  @ApiOperation({ summary: 'Yeni Gelir/Gider Islemi Ekle' })
  async createTransaction(@Body() dto: any, @Req() req: any, @Res() res: Response) {
    try {
      // Find a valid user for createdById FK
      const tenantUser = await this.prisma.user.findFirst({
        where: { tenantId: req.clientUser.tenantId },
        select: { id: true },
      });
      if (!tenantUser) {
        return res.status(400).json({ statusCode: 400, message: 'Tenant kullanıcısı bulunamadı' });
      }

      const transactionData = {
        tenantId: req.clientUser.tenantId,
        type: dto.type || 'INCOME',
        amount: dto.amount,
        currency: dto.currency || 'TRY',
        description: dto.description || null,
        transactionDate: new Date(dto.transactionDate || new Date()),
        paymentMethod: dto.paymentMethod || 'BANK_TRANSFER',
        referenceNumber: dto.referenceNumber || null,
        createdById: tenantUser.id,
      } as any;

      if (dto.customerSupplierId) {
        transactionData.customerSupplierId = dto.customerSupplierId;
      }

      const result = await this.prisma.$transaction(async (tx) => {
        const createdTx = await tx.transaction.create({ data: transactionData });
        
        if (dto.customerSupplierId) {
          const contact = await tx.customerSupplier.findUnique({ where: { id: dto.customerSupplierId } });
          if (contact) {
            // INCOME: Para alıyoruz -> Müşterinin bize olan borcu düşer
            // EXPENSE: Para ödüyoruz -> Tedarikçiye olan borcumuz düşer (veya tersi)
            // Sistemde pozitif bakiye = bize olan borç, negatif = bizim borcumuz.
            let newBalance = Number(contact.balance);
            if (transactionData.type === 'INCOME') {
              newBalance -= Number(transactionData.amount);
            } else {
              newBalance += Number(transactionData.amount);
            }
            await tx.customerSupplier.update({
              where: { id: contact.id },
              data: { balance: newBalance }
            });
          }
        }
        return createdTx;
      });

      return res.status(201).json(result);
    } catch (err: any) {
      console.error('[CLIENT_TRANSACTION_CREATE_ERROR]', err?.message);
      return res.status(400).json({
        statusCode: 400,
        message: err?.message || 'İşlem oluşturulamadı',
      });
    }
  }

  // ======================== CONTACTS (Cariler) ========================

  @Get('contacts/pivot')
  @ApiOperation({ summary: 'Cari Pivot Tablo Verisi' })
  async getContactsPivot(@Req() req: any) {
    const tenantId = req.clientUser.tenantId;

    const contacts = await this.prisma.customerSupplier.findMany({
      where: { tenantId, isActive: true },
      include: {
        invoices: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
            issueDate: true,
            dueDate: true,
            invoiceNumber: true,
            type: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return contacts.map((c) => {
      const invoices = c.invoices || [];
      const totalDebt = invoices
        .filter((i) => ['ISSUED', 'SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(i.status))
        .reduce((sum, i) => sum + Number(i.totalAmount), 0);
      const totalPaid = invoices
        .filter((i) => i.status === 'PAID')
        .reduce((sum, i) => sum + Number(i.totalAmount), 0);
      const overdueInvoices = invoices.filter((i) => i.status === 'OVERDUE');
      const overdueAmount = overdueInvoices.reduce((sum, i) => sum + Number(i.totalAmount), 0);
      const lastInvoice = invoices.length > 0
        ? invoices.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())[0]
        : null;
      const nextDueInvoice = invoices
        .filter((i) => i.dueDate && ['ISSUED', 'SENT', 'PARTIALLY_PAID'].includes(i.status))
        .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())[0] || null;

      return {
        id: c.id,
        name: c.name,
        type: c.type,
        phone: c.phone,
        email: c.email,
        city: c.city,
        address: c.address,
        taxNumber: c.taxNumber,
        balance: Number(c.balance),
        invoiceCount: invoices.length,
        totalDebt,
        totalPaid,
        remaining: totalDebt,
        overdueAmount,
        overdueCount: overdueInvoices.length,
        lastInvoiceDate: lastInvoice?.issueDate || null,
        nextDueDate: nextDueInvoice?.dueDate || null,
      };
    });
  }

  @Get('contacts')
  @ApiOperation({ summary: 'Carileri Listele' })
  async getContacts(@Req() req: any, @Query('search') search?: string, @Query('type') type?: string) {
    const where: any = { tenantId: req.clientUser.tenantId, isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { taxNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (type && type !== 'ALL') {
      where.type = type;
    }
    return this.prisma.customerSupplier.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  @Post('contacts')
  @ApiOperation({ summary: 'Yeni Cari Ekle' })
  async createContact(@Body() dto: any, @Req() req: any, @Res() res: Response) {
    try {
      const result = await this.prisma.customerSupplier.create({
        data: {
          tenantId: req.clientUser.tenantId,
          name: dto.name,
          type: dto.type || 'CUSTOMER',
          taxNumber: dto.taxNumber || null,
          taxOffice: dto.taxOffice || null,
          address: dto.address || null,
          city: dto.city || null,
          phone: dto.phone || null,
          email: dto.email || null,
          notes: dto.notes || null,
        } as any,
      });
      return res.status(201).json(result);
    } catch (err: any) {
      console.error('[CLIENT_CONTACT_CREATE_ERROR]', err?.message);
      return res.status(400).json({
        statusCode: 400,
        message: err?.message || 'Cari oluşturulamadı',
      });
    }
  }

  @Get('contacts/:id/summary')
  @ApiOperation({ summary: 'Cari Detay Ozeti' })
  async getContactSummary(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.clientUser.tenantId;
    const contact = await this.prisma.customerSupplier.findFirst({
      where: { id, tenantId, isActive: true },
    });
    if (!contact) return { error: 'Cari bulunamadı' };

    const invoices = await this.prisma.invoice.findMany({
      where: { customerSupplierId: id, tenantId },
      orderBy: { issueDate: 'desc' },
      select: {
        id: true,
        invoiceNumber: true,
        type: true,
        status: true,
        totalAmount: true,
        issueDate: true,
        dueDate: true,
      },
    });

    const totalDebt = invoices
      .filter((i) => ['ISSUED', 'SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(i.status))
      .reduce((sum, i) => sum + Number(i.totalAmount), 0);
    const totalPaid = invoices
      .filter((i) => i.status === 'PAID')
      .reduce((sum, i) => sum + Number(i.totalAmount), 0);

    return {
      contact,
      invoices,
      totalDebt,
      totalPaid,
      remaining: totalDebt,
      invoiceCount: invoices.length,
    };
  }

  @Delete('contacts/:id')
  @ApiOperation({ summary: 'Cari Sil (Pasife Al)' })
  async deleteContact(@Param('id') id: string, @Req() req: any) {
    await this.prisma.customerSupplier.updateMany({
      where: { id, tenantId: req.clientUser.tenantId },
      data: { isActive: false },
    });
    return { success: true, message: 'Cari pasife alındı' };
  }
}
