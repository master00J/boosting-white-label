-- Public key per profile (stored as JWK string)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_key TEXT;

-- Encrypted account credentials per order
CREATE TABLE IF NOT EXISTS order_credentials (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  -- AES-GCM encrypted JSON blob (base64)
  encrypted_data TEXT     NOT NULL,
  -- RSA-OAEP encrypted AES key (base64) — only the assigned booster can decrypt
  encrypted_key  TEXT     NOT NULL,
  -- AES-GCM IV (base64)
  iv             TEXT     NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

ALTER TABLE order_credentials ENABLE ROW LEVEL SECURITY;

-- Customer can manage credentials for their own orders
CREATE POLICY "customer_manage_own_credentials"
  ON order_credentials FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_credentials.order_id
        AND orders.customer_id = auth.uid()
    )
  );

-- Assigned booster can read credentials for their orders
CREATE POLICY "worker_read_assigned_credentials"
  ON order_credentials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN workers ON workers.id = orders.worker_id
      WHERE orders.id = order_credentials.order_id
        AND workers.profile_id = auth.uid()
    )
  );

GRANT ALL ON order_credentials TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON order_credentials TO authenticated;
