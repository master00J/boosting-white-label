-- Fix: permission denied for table admin_ranks / admin_rank_permissions
-- New tables are not covered by 00020 "GRANT ALL ON ALL TABLES" (only tables that existed then).
-- Explicitly grant service_role so the admin API (createAdminClient) can manage ranks.

GRANT ALL ON public.admin_ranks TO service_role;
GRANT ALL ON public.admin_rank_permissions TO service_role;
