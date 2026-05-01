-- =============================================
-- Worker profiles (public bio) + order_reviews.worker_id for per-worker reviews
-- =============================================

-- Worker public profile fields (optional bio, show on boosters page)
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS show_on_boosters_page BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN workers.bio IS 'Optional public bio for booster profile page';
COMMENT ON COLUMN workers.show_on_boosters_page IS 'If true, worker appears in public /boosters listing';

-- Link order reviews to the worker who did the order (for "personal reviews" on booster profile)
ALTER TABLE order_reviews
  ADD COLUMN IF NOT EXISTS worker_id UUID REFERENCES workers(id) ON DELETE SET NULL;

COMMENT ON COLUMN order_reviews.worker_id IS 'Worker who completed the order; used to show reviews on booster profile';

-- Backfill worker_id from order
UPDATE order_reviews r
SET worker_id = o.worker_id
FROM orders o
WHERE r.order_id = o.id AND r.worker_id IS NULL;

CREATE INDEX IF NOT EXISTS order_reviews_worker_id_idx ON order_reviews(worker_id);

-- Update worker average_rating and total_ratings from order_reviews (per-worker reviews)
CREATE OR REPLACE FUNCTION update_worker_rating_from_order_reviews()
RETURNS TRIGGER AS $$
DECLARE
  wid UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    wid := OLD.worker_id;
  ELSE
    wid := NEW.worker_id;
  END IF;
  IF wid IS NOT NULL THEN
    UPDATE workers
    SET
      average_rating = (
        SELECT ROUND(AVG(rating)::numeric, 2)::decimal(3,2)
        FROM order_reviews
        WHERE worker_id = wid AND is_public = true
      ),
      total_ratings = (
        SELECT COUNT(*)::int FROM order_reviews
        WHERE worker_id = wid AND is_public = true
      )
    WHERE id = wid;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_order_review_worker_rating
  AFTER INSERT OR UPDATE OF rating, is_public, worker_id OR DELETE ON order_reviews
  FOR EACH ROW EXECUTE FUNCTION update_worker_rating_from_order_reviews();
