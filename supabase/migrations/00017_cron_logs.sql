-- Cron job execution logs
CREATE TABLE IF NOT EXISTS cron_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name    TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('success', 'error', 'partial')),
  processed   INTEGER NOT NULL DEFAULT 0,
  errors      INTEGER NOT NULL DEFAULT 0,
  message     TEXT NOT NULL DEFAULT '',
  details     JSONB,
  ran_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cron_logs_job_name_idx ON cron_logs (job_name, ran_at DESC);
CREATE INDEX IF NOT EXISTS cron_logs_ran_at_idx ON cron_logs (ran_at DESC);

ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cron_logs_admin_read" ON cron_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- loyalty_transactions and loyalty_tiers already exist from 00008_marketing.sql
-- Add extra indexes for cron queries
CREATE INDEX IF NOT EXISTS loyalty_tx_profile_idx ON loyalty_transactions (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS loyalty_tx_expires_idx ON loyalty_transactions (expires_at) WHERE expires_at IS NOT NULL;

-- Promo banners table
CREATE TABLE IF NOT EXISTS promo_banners (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  cta_text   TEXT,
  cta_url    TEXT,
  bg_color   TEXT NOT NULL DEFAULT '#6366f1',
  is_active  BOOLEAN NOT NULL DEFAULT true,
  starts_at  TIMESTAMPTZ,
  ends_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE promo_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banners_public_read" ON promo_banners
  FOR SELECT USING (is_active = true);

CREATE POLICY "banners_admin_all" ON promo_banners
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'maintenance')),
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_public_read" ON announcements
  FOR SELECT USING (is_active = true);

CREATE POLICY "announcements_admin_all" ON announcements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Static pages table
CREATE TABLE IF NOT EXISTS static_pages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL DEFAULT '',
  is_published BOOLEAN NOT NULL DEFAULT true,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE static_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "static_pages_public_read" ON static_pages
  FOR SELECT USING (is_published = true);

CREATE POLICY "static_pages_admin_all" ON static_pages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- coupons table already created in 00005_orders.sql
-- coupons RLS already set in 00014_rls_policies.sql
