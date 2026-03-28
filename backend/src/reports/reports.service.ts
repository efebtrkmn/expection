import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceStatus, InvoiceType } from '@prisma/client';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Yönetici Paneli - Ana Sayfa Dashboard Özeti
   */
  async getDashboardSummary(tenantId: string, periodStart: Date, periodEnd: Date) {
    this.logger.log(`[Dashboard] Generating reporting summary for ${periodStart.toISOString()} - ${periodEnd.toISOString()}`);

    // Fatura Sayıları
    const invoiceCounts = await this.prisma.invoice.groupBy({
      by: ['type', 'status'],
      where: {
        tenantId,
        issueDate: { gte: periodStart, lte: periodEnd }
      },
      _count: true
    });

    // 600 ve 620 Hesapları (Gelir ve Maliyet) üzerinden kaba Kar/Zarar hesabı.
    // Daha detaylı hesap (770 vb.) P&L (Kar-Zarar) tablosunda yapılır.
    const revenueSum = await this.prisma.ledgerLine.aggregate({
      where: { 
        tenantId, 
        account: { code: { startsWith: '6' }, type: 'REVENUE' },
        createdAt: { gte: periodStart, lte: periodEnd }
      },
      _sum: { credit: true, debit: true } // Gelir hesapları Alacak(Credit) ile çalışır
    });

    const cogsSum = await this.prisma.ledgerLine.aggregate({
      where: { 
        tenantId, 
        account: { code: { startsWith: '6' }, type: 'EXPENSE' },
        createdAt: { gte: periodStart, lte: periodEnd }
      },
      _sum: { credit: true, debit: true } // Gider hesapları Borç(Debit) ile çalışır
    });

    const totalRevenue = (Number(revenueSum._sum.credit) || 0) - (Number(revenueSum._sum.debit) || 0);
    const totalCogs = (Number(cogsSum._sum.debit) || 0) - (Number(cogsSum._sum.credit) || 0);
    const grossProfit = totalRevenue - totalCogs;

    return {
      period: { start: periodStart, end: periodEnd },
      financials: {
        totalRevenue,
        totalCogs,
        grossProfit
      },
      invoiceStats: invoiceCounts
    };
  }

  /**
   * Gelir / Gider (Kar/Zarar - P&L) Tablosu (Chart.js JSON uyumlu export)
   */
  async getProfitAndLoss(tenantId: string, year: number) {
    // Grafikler için aylara bölünmüş bir Raw SQL GroupBy
    return this.prisma.$queryRaw`
      SELECT 
        TO_CHAR(entry_date, 'YYYY-MM') as month,
        SUM(CASE WHEN a.type = 'REVENUE' THEN l.credit - l.debit ELSE 0 END) as revenue,
        SUM(CASE WHEN a.type = 'EXPENSE' THEN l.debit - l.credit ELSE 0 END) as expense
      FROM ledger_lines l
      JOIN accounts a ON l.account_id = a.id
      JOIN journal_entries j ON l.journal_entry_id = j.id
      WHERE l.tenant_id = ${tenantId}::uuid 
        AND j.status = 'POSTED'
        AND EXTRACT(YEAR FROM entry_date) = ${year}
      GROUP BY TO_CHAR(entry_date, 'YYYY-MM')
      ORDER BY month ASC;
    `;
  }

  /**
   * MIZAN TABLOSU (Trial Balance) - Tüm hesapların Borç/Alacak Toplamları
   */
  async getTrialBalance(tenantId: string, asOfDate: Date) {
    return this.prisma.$queryRaw`
      SELECT 
        a.code,
        a.name,
        a.type,
        SUM(l.debit) as total_debit,
        SUM(l.credit) as total_credit,
        CASE 
          WHEN a.normal_balance = 'DEBIT' THEN SUM(l.debit) - SUM(l.credit)
          ELSE SUM(l.credit) - SUM(l.debit)
        END as current_balance
      FROM ledger_lines l
      JOIN accounts a ON l.account_id = a.id
      JOIN journal_entries j ON l.journal_entry_id = j.id
      WHERE l.tenant_id = ${tenantId}::uuid
        AND j.status = 'POSTED'
        AND j.entry_date <= ${asOfDate}
      GROUP BY a.code, a.name, a.type, a.normal_balance
      ORDER BY a.code ASC;
    `;
  }
}
