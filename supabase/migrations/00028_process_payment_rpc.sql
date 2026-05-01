-- Atomic payment processing function
-- Ensures order status, affiliate credit and customer total_spent
-- are updated in a single transaction — no partial updates possible.
CREATE OR REPLACE FUNCTION process_payment(
  p_order_ids    UUID[],
  p_payment_id   TEXT DEFAULT NULL,
  p_affiliate_id UUID DEFAULT NULL,
  p_commission   NUMERIC DEFAULT 0,
  p_customer_id  UUID DEFAULT NULL,
  p_total_spent  NUMERIC DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  -- Only callable from server-side via service role key, never from client
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: only service role can call process_payment';
  END IF;

  -- 1. Mark all orders as paid (awaiting admin release to queue)
  UPDATE orders
  SET
    status         = 'paid',
    payment_status = 'completed',
    payment_id     = COALESCE(p_payment_id, payment_id)
  WHERE id = ANY(p_order_ids);

  -- 2. Credit affiliate (only if provided)
  IF p_affiliate_id IS NOT NULL AND p_commission > 0 THEN
    UPDATE affiliates
    SET
      total_conversions = total_conversions + 1,
      total_earned      = total_earned + p_commission,
      pending_balance   = pending_balance + p_commission
    WHERE id = p_affiliate_id;
  END IF;

  -- 3. Update customer total_spent (only if provided)
  IF p_customer_id IS NOT NULL AND p_total_spent > 0 THEN
    UPDATE profiles
    SET total_spent = total_spent + p_total_spent
    WHERE id = p_customer_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
