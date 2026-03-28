import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BabsService {
  private readonly logger = new Logger(BabsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ba Formu Lojik Süzgeci - KDV HARİÇ 5.000 TL ve Üzeri Mal/Hizmet Alımları
   * @param tenantId İzole edilmiş işletme / müşteri IDsi
   * @param period 'YYYY-MM' formatında yıl ve ay
   */
  async getBaList(tenantId: string, period: string) {
    this.logger.log(`[Ba Engine] Running Form Ba limits query for Period: ${period}`);
    
    // Veritabanı Materialized View altyapısı üzerinden raw SQL
    // JSON ve Frontend Dashboard dostu Casing formatlaması uygulanır
    return this.prisma.$queryRaw`
      SELECT
        tax_number as "taxNumber",
        party_name as "partyName",
        document_count::integer as "documentCount",
        total_excl_vat as "totalExclVatAmount"
      FROM babs_purchase_summary
      WHERE tenant_id = ${tenantId}::uuid 
        AND period = ${period}
      ORDER BY total_excl_vat DESC;
    `;
  }

  /**
   * Bs Formu Lojik Süzgeci - KDV HARİÇ 5.000 TL ve Üzeri Mal/Hizmet Satışları
   * @param tenantId İzole edilmiş işletme / müşteri IDsi
   * @param period 'YYYY-MM' formatında yıl ve ay
   */
  async getBsList(tenantId: string, period: string) {
    this.logger.log(`[Bs Engine] Running Form Bs limits query for Period: ${period}`);
    
    return this.prisma.$queryRaw`
      SELECT
        tax_number as "taxNumber",
        party_name as "partyName",
        document_count::integer as "documentCount",
        total_excl_vat as "totalExclVatAmount"
      FROM babs_sales_summary
      WHERE tenant_id = ${tenantId}::uuid 
        AND period = ${period}
      ORDER BY total_excl_vat DESC;
    `;
  }
}
