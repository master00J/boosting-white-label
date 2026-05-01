-- Fix critical security issue: site_settings was publicly readable via anon key
-- This exposed API keys, webhook secrets, and payment credentials to anyone
-- who queried the PostgREST endpoint with the public anon key.

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can read site settings" ON site_settings;

-- Public keys: safe to expose (UI toggles, fee percentages, theme settings)
-- These keys do NOT contain secrets
CREATE POLICY "Public can read non-sensitive settings" ON site_settings
  FOR SELECT
  USING (
    key IN (
      'fee_pct_stripe', 'fee_fixed_stripe',
      'fee_pct_paypal', 'fee_fixed_paypal',
      'fee_pct_balance', 'fee_fixed_balance',
      'fee_pct_gold', 'fee_fixed_gold',
      'fee_pct_whop', 'fee_fixed_whop',
      'gold_enabled',
      'site_name', 'site_tagline', 'site_logo_url',
      'primary_color', 'maintenance_mode',
      'tawkto_property_id', 'tawkto_widget_id'
    )
  );

-- Admins can read everything (including secrets) — server-side only via service role
-- Note: sensitive reads (API keys, webhook secrets) should use the admin/service client,
-- never the anon client from the browser.
CREATE POLICY "Admins can read all settings" ON site_settings
  FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

-- Keep existing admin write policy (no change needed)
-- "Admins can update site settings" already exists from 00014_rls_policies.sql
