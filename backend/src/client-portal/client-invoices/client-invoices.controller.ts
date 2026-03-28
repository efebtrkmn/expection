import { Controller, Get, Param, Res, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { ClientInvoicesService } from './client-invoices.service';
import { ClientStatementService } from '../client-statement/client-statement.service';
import { ClientJwtGuard } from '../guards/client-jwt.guard';

@ApiTags('Musteri Portali - Faturalar ve Ekstre')
@UseGuards(ClientJwtGuard)
@Controller('client')
export class ClientInvoicesController {
  constructor(
    private readonly invoicesService: ClientInvoicesService,
    private readonly statementService: ClientStatementService,
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
}
