-- ============================================================
-- Expection — RLS & Güvenlik Kurulum Migration'ı
-- Bu script, Prisma migration'larından SONRA uygulanmalıdır.
-- Çalıştırma: psql DATABASE_MIGRATION_URL -f 001_rls_setup.sql
-- ============================================================

-- ============================================================
-- 1. VERİTABANI KULLANICILARI
-- ============================================================

-- Uygulama kullanıcısı: RLS bypass yetkisi YOK
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'expection_app') THEN
    CREATE ROLE expection_app LOGIN PASSWORD 'CHANGE_ME_APP_PASSWORD';
  END IF;
END $$;

-- Tablo izinleri (uygulama kullanıcısı)
GRANT CONNECT ON DATABASE expection_db TO expection_app;
GRANT USAGE ON SCHEMA public TO expection_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO expection_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO expection_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO expection_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO expection_app;

-- ============================================================
-- 2. ROW-LEVEL SECURITY — AKTIFLEŞTIRME
-- ============================================================

ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers_suppliers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices              ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_ledgers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens        ENABLE ROW LEVEL SECURITY;

-- FORCE RLS: tablo sahibi de dahil herkes politikaya tabi olsun
ALTER TABLE users                FORCE ROW LEVEL SECURITY;
ALTER TABLE customers_suppliers  FORCE ROW LEVEL SECURITY;
ALTER TABLE invoices              FORCE ROW LEVEL SECURITY;
ALTER TABLE transactions          FORCE ROW LEVEL SECURITY;
ALTER TABLE account_ledgers       FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs            FORCE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens        FORCE ROW LEVEL SECURITY;

-- ============================================================
-- 3. RLS POLİTİKALARI
-- Her tablo için: sadece kendi tenant_id'sine eşit kayıtlara erişim
-- ============================================================

-- USERS
CREATE POLICY tenant_isolation_policy ON users
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_insert_policy ON users
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  AS PERMISSIVE FOR INSERT WITH CHECK (true);

-- CUSTOMERS_SUPPLIERS
CREATE POLICY tenant_isolation_policy ON customers_suppliers
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- INVOICES
CREATE POLICY tenant_isolation_policy ON invoices
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- TRANSACTIONS
CREATE POLICY tenant_isolation_policy ON transactions
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ACCOUNT_LEDGERS
CREATE POLICY tenant_isolation_policy ON account_ledgers
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- AUDIT_LOGS: Uygulama tüm tenant'ların loglarını yazabilir (tenant_id null olabilir)
-- Okuma: kendi tenant_id'leri + SuperAdmin
CREATE POLICY audit_log_write_policy ON audit_logs
  AS PERMISSIVE FOR INSERT
  WITH CHECK (true);

CREATE POLICY audit_log_read_policy ON audit_logs
  AS PERMISSIVE FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    OR tenant_id IS NULL
  );

-- UPDATE/DELETE YASAK (audit log immutability)
CREATE POLICY audit_log_no_update ON audit_logs
  AS RESTRICTIVE FOR UPDATE
  USING (false);

CREATE POLICY audit_log_no_delete ON audit_logs
  AS RESTRICTIVE FOR DELETE
  USING (false);

-- REFRESH_TOKENS
CREATE POLICY tenant_isolation_policy ON refresh_tokens
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ============================================================
-- 4. POLİTİKA İZİNLERİ
-- Uygulama kullanıcısına politika kullanım izni
-- ============================================================

ALTER TABLE users               OWNER TO expection_app;
ALTER TABLE customers_suppliers OWNER TO expection_app;
ALTER TABLE invoices            OWNER TO expection_app;
ALTER TABLE transactions        OWNER TO expection_app;
ALTER TABLE account_ledgers     OWNER TO expection_app;
ALTER TABLE refresh_tokens      OWNER TO expection_app;

-- audit_logs için ownership superadmin'de kalır, insert izni verilir
GRANT INSERT, SELECT ON audit_logs TO expection_app;

-- ============================================================
-- 5. HELPER FONKSİYONLAR
-- ============================================================

-- Tenant ID'yi session'a set eden fonksiyon
CREATE OR REPLACE FUNCTION set_tenant_id(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, true);
END;
$$;

-- RLS'yi bypass etmek için admin fonksiyon (yalnızca migration'larda kullanılır)
CREATE OR REPLACE FUNCTION clear_tenant_id()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', '', true);
END;
$$;

-- Mevcut tenant_id'yi döndüren fonksiyon
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_tenant_id TEXT;
BEGIN
  v_tenant_id := current_setting('app.current_tenant_id', true);
  IF v_tenant_id IS NULL OR v_tenant_id = '' THEN
    RAISE EXCEPTION 'Tenant ID not set in session. Use set_tenant_id() first.';
  END IF;
  RETURN v_tenant_id::UUID;
END;
$$;

GRANT EXECUTE ON FUNCTION set_tenant_id(UUID) TO expection_app;
GRANT EXECUTE ON FUNCTION current_tenant_id() TO expection_app;

-- ============================================================
-- 6. AUDIT_LOG TRIGGER — Otomatik loglama (opsiyonel)
-- Kritik tablolarda UPDATE/DELETE işlemlerine otomatik log
-- ============================================================

CREATE OR REPLACE FUNCTION audit_log_trigger_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_action    TEXT;
BEGIN
  v_tenant_id := current_setting('app.current_tenant_id', true)::UUID;

  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
    INSERT INTO audit_logs (tenant_id, action, entity_type, entity_id, new_values, created_at)
    VALUES (v_tenant_id, v_action::audit_action_enum, TG_TABLE_NAME, NEW.id::text, row_to_json(NEW), NOW());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE';
    INSERT INTO audit_logs (tenant_id, action, entity_type, entity_id, old_values, new_values, created_at)
    VALUES (v_tenant_id, v_action::audit_action_enum, TG_TABLE_NAME, NEW.id::text, row_to_json(OLD), row_to_json(NEW), NOW());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    INSERT INTO audit_logs (tenant_id, action, entity_type, entity_id, old_values, created_at)
    VALUES (v_tenant_id, v_action::audit_action_enum, TG_TABLE_NAME, OLD.id::text, row_to_json(OLD), NOW());
    RETURN OLD;
  END IF;
END;
$$;

-- Trigger'ları faturalar ve cari hesaplar için aktifleştir
CREATE TRIGGER audit_invoices_trigger
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();

CREATE TRIGGER audit_customers_suppliers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON customers_suppliers
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();

COMMENT ON TABLE audit_logs IS 'KVKK uyumlu denetim logu tablosu. UPDATE ve DELETE işlemleri RLS ile kısıtlanmıştır.';
COMMENT ON FUNCTION set_tenant_id(UUID) IS 'Oturum bazlı tenant ID ataması. Her DB bağlantısında açılış anında çağrılmalıdır.';
