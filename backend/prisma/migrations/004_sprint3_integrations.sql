-- ============================================================
-- Expection — Sprint 3: e-Fatura, Bankacılık ve Pazaryeri
-- Bu migration psql ile (yönetici yetkisiyle) çalıştırılmalıdır.
-- ============================================================

-- 1. e-Fatura alanları için Index (Webhook lookup için kritik)
CREATE INDEX IF NOT EXISTS idx_invoices_e_invoice_uuid
  ON invoices(e_invoice_uuid)
  WHERE e_invoice_uuid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_e_invoice_status
  ON invoices(tenant_id, e_invoice_status);

-- 2. Banka Hesapları RLS
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts FORCE ROW LEVEL SECURITY;

CREATE POLICY bank_accounts_isolation ON bank_accounts
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- 3. Banka Hareketleri RLS + Performance Index
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions FORCE ROW LEVEL SECURITY;

CREATE POLICY bank_transactions_isolation ON bank_transactions
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE INDEX IF NOT EXISTS idx_bank_tx_unreconciled
  ON bank_transactions(tenant_id, is_reconciled)
  WHERE is_reconciled = false;

CREATE INDEX IF NOT EXISTS idx_bank_tx_reference
  ON bank_transactions(bank_account_id, reference_number, transaction_date);

-- 4. Pazaryeri Bağlantıları RLS
ALTER TABLE marketplace_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_connections FORCE ROW LEVEL SECURITY;

CREATE POLICY marketplace_connections_isolation ON marketplace_connections
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- 5. Pazaryeri Siparişleri RLS + Index
ALTER TABLE marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_orders FORCE ROW LEVEL SECURITY;

CREATE POLICY marketplace_orders_isolation ON marketplace_orders
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE INDEX IF NOT EXISTS idx_marketplace_orders_unlinked
  ON marketplace_orders(tenant_id, invoice_id)
  WHERE invoice_id IS NULL;
