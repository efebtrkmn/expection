"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ClientStatementService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientStatementService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let ClientStatementService = ClientStatementService_1 = class ClientStatementService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(ClientStatementService_1.name);
        this.statusLabels = {
            DRAFT: 'Taslak', ISSUED: 'Kesildi', SENT: 'Gönderildi',
            PAID: 'Ödendi', OVERDUE: 'Vadesi Geçmiş', CANCELLED: 'İptal',
        };
    }
    async generateStatementPdf(contactId, tenantId) {
        const [customer, tenant, invoices] = await Promise.all([
            this.prisma.customerSupplier.findFirst({ where: { id: contactId, tenantId } }),
            this.prisma.tenant.findUnique({ where: { id: tenantId } }),
            this.prisma.invoice.findMany({
                where: { tenantId, customerSupplierId: contactId, status: { not: client_1.InvoiceStatus.DRAFT } },
                orderBy: { issueDate: 'asc' },
            }),
        ]);
        const html = this.buildStatementHtml({
            customer,
            tenant,
            invoices,
            generatedAt: new Date(),
        });
        try {
            const puppeteer = await Promise.resolve().then(() => require('puppeteer'));
            const browser = await puppeteer.default.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' },
            });
            await browser.close();
            this.logger.log(`PDF ekstre oluşturuldu: ${customer?.name} (${invoices.length} fatura)`);
            return Buffer.from(pdf);
        }
        catch (err) {
            this.logger.error(`Puppeteer PDF üretim hatası: ${err.message}`);
            return Buffer.from(html);
        }
    }
    buildStatementHtml(data) {
        const totalDebt = data.invoices
            .filter(i => [client_1.InvoiceStatus.ISSUED, client_1.InvoiceStatus.SENT, client_1.InvoiceStatus.OVERDUE].includes(i.status))
            .reduce((sum, i) => sum + Number(i.totalAmount), 0);
        const rows = data.invoices.map(inv => `
      <tr>
        <td>${inv.invoiceNumber}</td>
        <td>${new Date(inv.issueDate).toLocaleDateString('tr-TR')}</td>
        <td>${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('tr-TR') : '—'}</td>
        <td style="text-align:right">₺${Number(inv.totalAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
        <td style="text-align:center">
          <span style="
            display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;
            background:${inv.status === 'PAID' ? '#d1fae5' : inv.status === 'OVERDUE' ? '#fee2e2' : '#e0e7ff'};
            color:${inv.status === 'PAID' ? '#065f46' : inv.status === 'OVERDUE' ? '#991b1b' : '#3730a3'};
          ">${this.statusLabels[inv.status] || inv.status}</span>
        </td>
      </tr>
    `).join('');
        return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <style>
    * { margin:0;padding:0;box-sizing:border-box }
    body { font-family:Arial,sans-serif;font-size:12px;color:#111827;padding:20px }
    .header { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #6366f1 }
    .brand { font-size:22px;font-weight:700;color:#6366f1 }
    .title { font-size:18px;font-weight:600;margin-top:4px;color:#374151 }
    .info-grid { display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:20px 0 }
    .info-box { background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px }
    .info-box h3 { font-size:11px;text-transform:uppercase;color:#9ca3af;letter-spacing:.05em;margin-bottom:8px }
    .info-box p { color:#111827;font-size:13px;line-height:1.6 }
    table { width:100%;border-collapse:collapse;margin-top:20px }
    th { background:#6366f1;color:#fff;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase }
    td { padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:12px }
    tr:hover td { background:#fafafa }
    .total-row { background:#f0f4ff;font-weight:700 }
    .footer { margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:11px }
    .watermark { position:fixed;bottom:40px;right:40px;opacity:.07;font-size:80px;font-weight:900;color:#6366f1;transform:rotate(-30deg) }
  </style>
</head>
<body>
  <div class="watermark">EXPECTION</div>
  <div class="header">
    <div>
      <div class="brand">Expection</div>
      <div class="title">Cari Hesap Ekstresi</div>
    </div>
    <div style="text-align:right;color:#6b7280">
      <div>Tarih: ${data.generatedAt.toLocaleDateString('tr-TR')}</div>
      <div style="font-size:11px;margin-top:4px">Saat: ${data.generatedAt.toLocaleTimeString('tr-TR')}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h3>İşletme Bilgileri</h3>
      <p><strong>${data.tenant?.name || 'İşletme'}</strong></p>
      ${data.tenant?.taxNumber ? `<p>VKN: ${data.tenant.taxNumber}</p>` : ''}
    </div>
    <div class="info-box">
      <h3>Müşteri Bilgileri</h3>
      <p><strong>${data.customer?.name || 'Müşteri'}</strong></p>
      ${data.customer?.taxNumber ? `<p>VKN/TCN: ${data.customer.taxNumber}</p>` : ''}
      ${data.customer?.email ? `<p>${data.customer.email}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Fatura No</th>
        <th>Tarih</th>
        <th>Vade</th>
        <th style="text-align:right">Tutar</th>
        <th style="text-align:center">Durum</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="3">Toplam Açık Bakiye</td>
        <td style="text-align:right;color:#6366f1">₺${totalDebt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    Bu ekstre Expection SaaS tarafından otomatik olarak oluşturulmuştur. • ${data.generatedAt.toLocaleDateString('tr-TR')}
  </div>
</body>
</html>`;
    }
};
exports.ClientStatementService = ClientStatementService;
exports.ClientStatementService = ClientStatementService = ClientStatementService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ClientStatementService);
//# sourceMappingURL=client-statement.service.js.map