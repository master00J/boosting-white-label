-- Fix: permission denied for table account_loadouts
-- authenticated role needs explicit GRANT for tables created after 00042
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_loadouts TO authenticated;

-- profiles.active_loadout_id: authenticated needs UPDATE to set active loadout
GRANT UPDATE ON public.profiles TO authenticated;
