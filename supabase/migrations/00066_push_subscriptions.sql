-- Push notification subscriptions for PWA chat agent app
-- Each row is a browser/device push subscription belonging to an agent profile

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint    TEXT        NOT NULL UNIQUE,
  keys        JSONB       NOT NULL,  -- { p256dh, auth }
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_profile ON push_subscriptions(profile_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Only service_role can read/write (server-side only)
CREATE POLICY "push_service_role" ON push_subscriptions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Authenticated users can manage their own subscriptions
CREATE POLICY "push_own_select" ON push_subscriptions FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "push_own_insert" ON push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "push_own_delete" ON push_subscriptions FOR DELETE TO authenticated
  USING (profile_id = auth.uid());

GRANT ALL ON push_subscriptions TO service_role;
GRANT SELECT, INSERT, DELETE ON push_subscriptions TO authenticated;
