-- Repair migration for existing white-label instances that were deployed before
-- live chat, push subscriptions, and order ID settings were added.

ALTER TABLE games ADD COLUMN IF NOT EXISTS order_code TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS order_code TEXT;

INSERT INTO site_settings (key, value) VALUES
  ('order_id', '{"brand": "BST"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

UPDATE site_settings
SET value = value || '{"custom_chat_enabled": true}'::jsonb
WHERE key = 'integrations'
  AND NOT (value ? 'custom_chat_enabled');

CREATE TABLE IF NOT EXISTS chat_conversations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  customer_name   TEXT        NOT NULL DEFAULT '',
  customer_email  TEXT        NOT NULL DEFAULT '',
  order_id        UUID        REFERENCES orders(id) ON DELETE SET NULL,
  order_number    TEXT,
  game_name       TEXT,
  service_name    TEXT,
  status          TEXT        NOT NULL DEFAULT 'open'
                              CHECK (status IN ('open', 'closed')),
  unread_count    INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id       UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  sender_role     TEXT        NOT NULL CHECK (sender_role IN ('customer', 'agent', 'system')),
  sender_name     TEXT        NOT NULL DEFAULT '',
  body            TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_agents (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID        NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  granted_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_customer ON chat_conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_msg ON chat_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id, created_at);

CREATE OR REPLACE FUNCTION is_chat_agent()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    OR
    EXISTS (SELECT 1 FROM chat_agents WHERE profile_id = auth.uid());
$$;

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_agents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_conversations' AND policyname = 'conv_select'
  ) THEN
    CREATE POLICY "conv_select" ON chat_conversations FOR SELECT TO authenticated
      USING (customer_id = auth.uid() OR is_chat_agent());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_conversations' AND policyname = 'conv_insert'
  ) THEN
    CREATE POLICY "conv_insert" ON chat_conversations FOR INSERT TO authenticated
      WITH CHECK (customer_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_conversations' AND policyname = 'conv_update_agent'
  ) THEN
    CREATE POLICY "conv_update_agent" ON chat_conversations FOR UPDATE TO authenticated
      USING (is_chat_agent()) WITH CHECK (is_chat_agent());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_conversations' AND policyname = 'conv_service_role'
  ) THEN
    CREATE POLICY "conv_service_role" ON chat_conversations FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'msg_select_own'
  ) THEN
    CREATE POLICY "msg_select_own" ON chat_messages FOR SELECT TO authenticated
      USING (
        is_chat_agent()
        OR EXISTS (
          SELECT 1 FROM chat_conversations c
          WHERE c.id = chat_messages.conversation_id AND c.customer_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'msg_insert_customer'
  ) THEN
    CREATE POLICY "msg_insert_customer" ON chat_messages FOR INSERT TO authenticated
      WITH CHECK (
        sender_role = 'customer'
        AND EXISTS (
          SELECT 1 FROM chat_conversations c
          WHERE c.id = chat_messages.conversation_id
            AND c.customer_id = auth.uid()
            AND c.status = 'open'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'msg_insert_agent'
  ) THEN
    CREATE POLICY "msg_insert_agent" ON chat_messages FOR INSERT TO authenticated
      WITH CHECK (sender_role = 'agent' AND is_chat_agent());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'msg_service_role'
  ) THEN
    CREATE POLICY "msg_service_role" ON chat_messages FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_agents' AND policyname = 'agents_select'
  ) THEN
    CREATE POLICY "agents_select" ON chat_agents FOR SELECT TO authenticated
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_agents' AND policyname = 'agents_service_role'
  ) THEN
    CREATE POLICY "agents_service_role" ON chat_agents FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT ALL ON chat_conversations TO service_role;
GRANT ALL ON chat_messages TO service_role;
GRANT ALL ON chat_agents TO service_role;
GRANT SELECT, INSERT, UPDATE ON chat_conversations TO authenticated;
GRANT SELECT, INSERT ON chat_messages TO authenticated;
GRANT SELECT ON chat_agents TO authenticated;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint    TEXT        NOT NULL UNIQUE,
  keys        JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_profile ON push_subscriptions(profile_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'push_subscriptions' AND policyname = 'push_service_role'
  ) THEN
    CREATE POLICY "push_service_role" ON push_subscriptions FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'push_subscriptions' AND policyname = 'push_own_select'
  ) THEN
    CREATE POLICY "push_own_select" ON push_subscriptions FOR SELECT TO authenticated
      USING (profile_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'push_subscriptions' AND policyname = 'push_own_insert'
  ) THEN
    CREATE POLICY "push_own_insert" ON push_subscriptions FOR INSERT TO authenticated
      WITH CHECK (profile_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'push_subscriptions' AND policyname = 'push_own_delete'
  ) THEN
    CREATE POLICY "push_own_delete" ON push_subscriptions FOR DELETE TO authenticated
      USING (profile_id = auth.uid());
  END IF;
END $$;

GRANT ALL ON push_subscriptions TO service_role;
GRANT SELECT, INSERT, DELETE ON push_subscriptions TO authenticated;
