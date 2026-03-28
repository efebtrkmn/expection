-- ============================================================
-- Expection — Sprint 5: AI Sınıflandırma Kuyruğu + QA Altyapısı
-- ============================================================

-- 1. AI Classification Queue RLS
ALTER TABLE ai_classification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_classification_queue FORCE ROW LEVEL SECURITY;

CREATE POLICY ai_queue_isolation ON ai_classification_queue
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- PENDING_REVIEW kuyruğu için index (admin dashboard lookup)
CREATE INDEX IF NOT EXISTS idx_ai_queue_pending
  ON ai_classification_queue(tenant_id, status)
  WHERE status = 'PENDING_REVIEW';

-- Confidence score distribution analizi için
CREATE INDEX IF NOT EXISTS idx_ai_queue_confidence
  ON ai_classification_queue(tenant_id, confidence_score DESC);

-- 2. TenantSettings'e AI eşik alanları ekleme
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS ai_confidence_threshold DECIMAL(5,2) DEFAULT 90.0,
  ADD COLUMN IF NOT EXISTS ai_auto_classify_enabled BOOLEAN DEFAULT TRUE;

-- 3. Güvenlik: Audit log tablosuna indeks (RLS policy doğrulama sorguları için)
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_action
  ON audit_logs(tenant_id, action, created_at DESC);
