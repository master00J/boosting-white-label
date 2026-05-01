-- Live Chat System
-- Tables: chat_conversations, chat_messages, chat_agents
-- RLS: customers see own data; chat_agents + super_admin see all

-- ============================================================
-- 1. TABLES
-- ============================================================

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

-- Which profiles have agent (chat support) access
CREATE TABLE IF NOT EXISTS chat_agents (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID        NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  granted_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_chat_conversations_customer ON chat_conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status   ON chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_msg ON chat_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation  ON chat_messages(conversation_id, created_at);

-- ============================================================
-- 3. HELPER FUNCTION (security definer — evaluates as superuser)
-- ============================================================

CREATE OR REPLACE FUNCTION is_chat_agent()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    OR
    EXISTS (SELECT 1 FROM chat_agents WHERE profile_id = auth.uid());
$$;

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_agents        ENABLE ROW LEVEL SECURITY;

-- chat_conversations --
CREATE POLICY "conv_select" ON chat_conversations FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR is_chat_agent());

CREATE POLICY "conv_insert" ON chat_conversations FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "conv_update_agent" ON chat_conversations FOR UPDATE TO authenticated
  USING (is_chat_agent()) WITH CHECK (is_chat_agent());

CREATE POLICY "conv_service_role" ON chat_conversations FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- chat_messages --
CREATE POLICY "msg_select_own" ON chat_messages FOR SELECT TO authenticated
  USING (
    is_chat_agent()
    OR EXISTS (
      SELECT 1 FROM chat_conversations c
      WHERE c.id = chat_messages.conversation_id AND c.customer_id = auth.uid()
    )
  );

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

CREATE POLICY "msg_insert_agent" ON chat_messages FOR INSERT TO authenticated
  WITH CHECK (sender_role = 'agent' AND is_chat_agent());

CREATE POLICY "msg_service_role" ON chat_messages FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- chat_agents (only super_admin / service_role manages this) --
CREATE POLICY "agents_select" ON chat_agents FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "agents_service_role" ON chat_agents FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 5. REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;

-- ============================================================
-- 6. GRANTS
-- ============================================================

GRANT ALL ON chat_conversations TO service_role;
GRANT ALL ON chat_messages      TO service_role;
GRANT ALL ON chat_agents        TO service_role;

GRANT SELECT, INSERT, UPDATE ON chat_conversations TO authenticated;
GRANT SELECT, INSERT          ON chat_messages      TO authenticated;
GRANT SELECT                  ON chat_agents        TO authenticated;
