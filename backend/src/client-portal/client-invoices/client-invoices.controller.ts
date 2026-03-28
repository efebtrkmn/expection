import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { ClientInvoicesService } from './client-invoices.service';
import { ClientStatementService } from '../client-statement/client-statement.service';
import { ClientJwtGuard } from '../guards/client-jwt.guard';

/**
 * Req.clientUser context'i ClientJwtGuard tarafından set edilir.
 * Bu controller'daki her endpoint yalnızca kendi carisi verisine erişebilir.
 */
@ApiTags('Müşteri Portalı — Faturalar ve Ekstre')
@UseGuards(ClientJwtGuard)
@Controller('client')
export class ClientInvoicesController {
  constructor(
    private readonly invoicesService: ClientInvoicesService,
    private readonly statementService: ClientStatementService,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Müşteri Bakiye Özeti (Toplam Borç / Vadesi Geçmiş / Ödenen)' })
  getSummary(Req() req: any) {
    return this.invoicesService.getMySummary(req.clientUser.contactId, req.clientUser.tenantId);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Kendi Faturalarım (RLS ile izole edilmiş)' })
  getInvoices(Req() req: any) {
    return this.invoicesService.getMyInvoices(req.clientUser.contactId, req.clientUser.tenantId);
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Fatura Detayı (Başka bir müşterinin faturasına erişim 403 döner)' })
  getInvoiceDetail(@Param('id') id: string, Req() req: any) {
    return this.invoicesService.getMyInvoiceDetail(id, req.clientUser.contactId, req.clientUser.tenantId);
  }

  @Get('statement/pdf')
  @ApiOperation({ summary: 'Cari Ekstre PDF İndir (Puppeteer ile oluşturulur)' })
  async downloadPdf(Req() req: any, @Res() res: Response) {
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
}
