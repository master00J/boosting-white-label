-- =============================================
-- ORDER REVIEWS
-- =============================================

CREATE TABLE IF NOT EXISTS order_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reviewer_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  is_public     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id) -- one review per order
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS order_reviews_order_id_idx ON order_reviews(order_id);
CREATE INDEX IF NOT EXISTS order_reviews_reviewer_id_idx ON order_reviews(reviewer_id);

-- RLS
ALTER TABLE order_reviews ENABLE ROW LEVEL SECURITY;

-- Customer can insert a review for their own completed order (once)
CREATE POLICY "Customer can create review"
  ON order_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
        AND orders.customer_id = auth.uid()
        AND orders.status = 'completed'
    )
  );

-- Customer can read their own reviews
CREATE POLICY "Customer can read own reviews"
  ON order_reviews FOR SELECT
  TO authenticated
  USING (reviewer_id = auth.uid());

-- Public reviews are visible to everyone (for a public reviews page)
CREATE POLICY "Public reviews are visible"
  ON order_reviews FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

-- Admins can read all reviews
CREATE POLICY "Admins can read all reviews"
  ON order_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admins can update reviews (e.g. hide/unhide)
CREATE POLICY "Admins can update reviews"
  ON order_reviews FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Service role has full access
CREATE POLICY "Service role full access"
  ON order_reviews FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
