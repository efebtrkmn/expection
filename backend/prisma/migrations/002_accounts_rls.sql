-- ============================================================
-- Sprint 2 — Çift Taraflı Muhasebe RLS ve Kısıtlamalar
-- Çalıştırma: psql DATABASE_URL -f 002_accounts_rls.sql
-- ============================================================

-- ============================================================
-- 1. ROW-LEVEL SECURITY AKTİFLEŞTİRME
-- ============================================================
ALTER TABLE accounts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_lines         ENABLE ROW LEVEL SECURITY;
ALTER TABLE products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items        ENABLE ROW LEVEL SECURITY;

ALTER TABLE accounts             FORCE ROW LEVEL SECURITY;
ALTER TABLE journal_entries      FORCE ROW LEVEL SECURITY;
ALTER TABLE ledger_lines         FORCE ROW LEVEL SECURITY;
ALTER TABLE products             FORCE ROW LEVEL SECURITY;
ALTER TABLE invoice_items        FORCE ROW LEVEL SECURITY;

-- ============================================================
-- 2. RLS POLİTİKALARI (İzolasyon)
-- ============================================================
CREATE POLICY tenant_isolation_policy ON accounts
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_policy ON journal_entries
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_policy ON ledger_lines
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_policy ON products
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_policy ON invoice_items
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ============================================================
-- 3. CHECK KISITLAMALARI (Veri Tutarlılığı)
-- ============================================================

-- Ledger Lines: Borç veya alacak 0'dan büyük olmalı, ikisi birden olamaz
ALTER TABLE ledger_lines ADD CONSTRAINT chk_ledger_positive 
  CHECK (debit >= 0 AND credit >= 0);

ALTER TABLE ledger_lines ADD CONSTRAINT chk_ledger_exclusive 
  CHECK (NOT (debit > 0 AND credit > 0));

-- ============================================================
-- 4. YEVMİYE DENGE GÖRÜNÜMÜ (Balance Check View)
-- ============================================================
CREATE OR REPLACE VIEW journal_balance_check AS
  SELECT 
    journal_entry_id,
    tenant_id,
    SUM(debit) AS total_debit,
    SUM(credit) AS total_credit,
    ABS(SUM(debit) - SUM(credit)) AS difference
  FROM ledger_lines
  GROUP BY journal_entry_id, tenant_id;

-- Yetkilendirme
ALTER TABLE accounts             OWNER TO expection_app;
ALTER TABLE journal_entries      OWNER TO expection_app;
ALTER TABLE ledger_lines         OWNER TO expection_app;
ALTER TABLE products             OWNER TO expection_app;
ALTER TABLE invoice_items        OWNER TO expection_app;
ALTER VIEW journal_balance_check OWNER TO expection_app;
