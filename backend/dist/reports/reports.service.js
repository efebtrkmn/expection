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
var ReportsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ReportsService = ReportsService_1 = class ReportsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(ReportsService_1.name);
    }
    async getDashboardSummary(tenantId, periodStart, periodEnd) {
        this.logger.log(`[Dashboard] Generating reporting summary for ${periodStart.toISOString()} - ${periodEnd.toISOString()}`);
        const invoiceCounts = await this.prisma.invoice.groupBy({
            by: ['type', 'status'],
            where: {
                tenantId,
                issueDate: { gte: periodStart, lte: periodEnd }
            },
            _count: true
        });
        const revenueSum = await this.prisma.ledgerLine.aggregate({
            where: {
                tenantId,
                account: { code: { startsWith: '6' }, type: 'REVENUE' },
                createdAt: { gte: periodStart, lte: periodEnd }
            },
            _sum: { credit: true, debit: true }
        });
        const cogsSum = await this.prisma.ledgerLine.aggregate({
            where: {
                tenantId,
                account: { code: { startsWith: '6' }, type: 'EXPENSE' },
                createdAt: { gte: periodStart, lte: periodEnd }
            },
            _sum: { credit: true, debit: true }
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
    async getProfitAndLoss(tenantId, year) {
        return this.prisma.$queryRaw `
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
    async getTrialBalance(tenantId, asOfDate) {
        return this.prisma.$queryRaw `
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
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = ReportsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map