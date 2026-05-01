-- Idempotency table for webhook processing
-- Prevents duplicate processing when Whop/Stripe/PayPal retry webhooks
CREATE TABLE IF NOT EXISTS processed_webhooks (
  webhook_id   TEXT        NOT NULL,
  provider     TEXT        NOT NULL,
  event_type   TEXT        NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (webhook_id, provider)
);

-- Auto-cleanup: remove entries older than 30 days (outside dispute window)
CREATE INDEX IF NOT EXISTS idx_processed_webhooks_processed_at
  ON processed_webhooks (processed_at);

-- Only service role can read/write (webhooks run server-side with service role)
ALTER TABLE processed_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON processed_webhooks
  USING (false)
  WITH CHECK (false);

-- Fix process_payment RPC: only update orders still in pending_payment
-- to prevent double-processing on webhook retries
CREATE OR REPLACE FUNCTION process_payment(
  p_order_ids    UUID[],
  p_payment_id   TEXT DEFAULT NULL,
  p_affiliate_id UUID DEFAULT NULL,
  p_commission   NUMERIC DEFAULT 0,
  p_customer_id  UUID DEFAULT NULL,
  p_total_spent  NUMERIC DEFAULT 0
) RETURNS VOID AS $$
DECLARE
  v_updated_count INT;
BEGIN
  -- Only callable from server-side via service role key, never from client
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: only service role can call process_payment';
  END IF;

  -- 1. Mark orders as paid — only if still pending_payment (idempotency guard)
  UPDATE orders
  SET
    status         = 'paid',
    payment_status = 'completed',
    payment_id     = COALESCE(p_payment_id, payment_id)
  WHERE id = ANY(p_order_ids)
    AND payment_status = 'pending';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- 2. Only credit affiliate and total_spent if we actually updated orders
  --    (prevents double-crediting on webhook retries)
  IF v_updated_count > 0 THEN
    IF p_affiliate_id IS NOT NULL AND p_commission > 0 THEN
      UPDATE affiliates
      SET
        total_conversions = total_conversions + 1,
        total_earned      = total_earned + p_commission,
        pending_balance   = pending_balance + p_commission
      WHERE id = p_affiliate_id;
    END IF;

    IF p_customer_id IS NOT NULL AND p_total_spent > 0 THEN
      UPDATE profiles
      SET total_spent = total_spent + p_total_spent
      WHERE id = p_customer_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
