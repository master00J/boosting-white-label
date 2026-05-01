-- RPC for storefront stats (no mock data: real counts from DB)
CREATE OR REPLACE FUNCTION get_storefront_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  completed_orders BIGINT;
  review_count BIGINT;
  avg_rating NUMERIC;
BEGIN
  SELECT COUNT(*) INTO completed_orders FROM orders WHERE status = 'completed';
  SELECT COUNT(*), COALESCE(ROUND(AVG(rating)::numeric, 1), 0)
    INTO review_count, avg_rating
    FROM order_reviews
    WHERE is_public = true;
  RETURN json_build_object(
    'completed_orders', completed_orders,
    'review_count', review_count,
    'avg_rating', (SELECT ROUND(avg_rating::numeric, 1))
  );
END;
$$;

COMMENT ON FUNCTION get_storefront_stats() IS 'Returns real storefront stats for homepage/footer: completed_orders, review_count, avg_rating';
