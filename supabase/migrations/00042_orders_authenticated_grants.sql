-- Fix: permission denied for table orders (and related tables)
-- authenticated role needs table-level GRANTs for RLS to apply.
-- RLS controls which rows are visible; GRANT controls table access.

-- Schema + all tables: mirrors service_role pattern but for authenticated
-- RLS policies still restrict row-level access per user
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- SECURITY DEFINER functions (get_storefront_stats)
GRANT SELECT ON public.orders TO postgres;
GRANT SELECT ON public.order_reviews TO postgres;
