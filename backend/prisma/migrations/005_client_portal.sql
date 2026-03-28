-- ============================================================
-- Expection — Sprint 4: Müşteri Portalı, Mutabakat, Iyzico
-- ============================================================

-- 1. Tenant Settings RLS
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_settings_isolation ON tenant_settings
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- 2. Client Users RLS + Unique index
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_users FORCE ROW LEVEL SECURITY;
CREATE POLICY client_users_isolation ON client_users
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_client_users_tenant_email
  ON client_users(tenant_id, email);

-- 3. Reconciliation Requests RLS
ALTER TABLE reconciliation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY reconciliation_requests_isolation ON reconciliation_requests
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Token lookup için partial index (sadece PENDING olanlar)
CREATE INDEX IF NOT EXISTS idx_recon_token_pending
  ON reconciliation_requests(token_hash)
  WHERE status = 'PENDING';

-- Zımni kabul worker için: süresi dolmuş + PENDING
CREATE INDEX IF NOT EXISTS idx_recon_tacit_candidates
  ON reconciliation_requests(expires_at, status)
  WHERE status = 'PENDING';

-- 4. Iyzico Settings
ALTER TABLE iyzico_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE iyzico_settings FORCE ROW LEVEL SECURITY;
CREATE POLICY iyzico_settings_isolation ON iyzico_settings
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- 5. Payment Sessions RLS + ConversationId index (Callback lookup için kritik)
ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY payment_sessions_isolation ON payment_sessions
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_payment_sessions_conversation
  ON payment_sessions(conversation_id);

-- 6. Invoice tablosuna Sprint 4 alanları (eğer yoksa)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
  ADD COLUMN IF NOT EXISTS payment_session_id UUID;

CREATE INDEX IF NOT EXISTS idx_invoices_paid
  ON invoices(tenant_id, status)
  WHERE status = 'PAID';
