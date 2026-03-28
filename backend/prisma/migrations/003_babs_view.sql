-- ============================================================
-- Expection — Sprint 2: Ba/Bs Raporlama Motoru (VUK 148)
-- Bu migration, Prisma "migrate dev" işleminden SONRA,
-- psql (Yönetici yetkisi ile) çalıştırılmalıdır.
-- ============================================================

-- ============================================================
-- 1. BA_SUMMARY_VIEW (Form Ba - Mal ve Hizmet Alımları)
-- ============================================================
-- Kapsam: Alış Faturaları (PURCHASE) + Satıştan İadeler (RETURN_SALES)
-- Kural: İlgili Ay (YYYY-MM) + Aynı Vergi No + (Net Tutar >= 5000 TL)
-- Status: Sadece Resmileşmiş / Tamamlanmış faturalar ('ISSUED', 'PAID', 'OVERDUE')

CREATE OR REPLACE VIEW babs_purchase_summary AS
  SELECT 
    i.tenant_id,
    TO_CHAR(i.issue_date, 'YYYY-MM') AS period,
    cs.tax_number,
    cs.name AS party_name,
    COUNT(*) AS document_count,
    SUM(i.subtotal) AS total_excl_vat
  FROM invoices i
  JOIN customers_suppliers cs ON cs.id = i.customer_supplier_id
  WHERE i.status IN ('ISSUED', 'PAID', 'OVERDUE')
    AND i.type IN ('PURCHASE', 'RETURN_SALES')
  GROUP BY 
    i.tenant_id, 
    TO_CHAR(i.issue_date, 'YYYY-MM'), 
    cs.tax_number, 
    cs.name
  HAVING SUM(i.subtotal) >= 5000;

ALTER VIEW babs_purchase_summary OWNER TO expection_app;
GRANT SELECT ON babs_purchase_summary TO expection_app;


-- ============================================================
-- 2. BS_SUMMARY_VIEW (Form Bs - Mal ve Hizmet Satışları)
-- ============================================================
-- Kapsam: Satış Faturaları (SALES) + Alıştan İadeler (RETURN_PURCHASE)

CREATE OR REPLACE VIEW babs_sales_summary AS
  SELECT 
    i.tenant_id,
    TO_CHAR(i.issue_date, 'YYYY-MM') AS period,
    cs.tax_number,
    cs.name AS party_name,
    COUNT(*) AS document_count,
    SUM(i.subtotal) AS total_excl_vat
  FROM invoices i
  JOIN customers_suppliers cs ON cs.id = i.customer_supplier_id
  WHERE i.status IN ('ISSUED', 'PAID', 'OVERDUE')
    AND i.type IN ('SALES', 'RETURN_PURCHASE')
  GROUP BY 
    i.tenant_id, 
    TO_CHAR(i.issue_date, 'YYYY-MM'), 
    cs.tax_number, 
    cs.name
  HAVING SUM(i.subtotal) >= 5000;

ALTER VIEW babs_sales_summary OWNER TO expection_app;
GRANT SELECT ON babs_sales_summary TO expection_app;
