-- Fix: permission denied for table orders when calling get_storefront_stats
-- SECURITY DEFINER functions run as their owner; the owner needs SELECT on the tables.
-- Also ensures the function exists (in case 00035 was skipped).

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

-- Ensure postgres role can read tables (for SECURITY DEFINER owner)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    GRANT SELECT ON public.orders TO postgres;
    GRANT SELECT ON public.order_reviews TO postgres;
  END IF;
END $$;
