-- Users can view profiles of people they referred (for referrals page)
-- Limited to referred_by = auth.uid() so users only see their referrals
CREATE POLICY "Users can view referred profiles" ON profiles
  FOR SELECT
  USING (referred_by = auth.uid());

-- Allow public read of referral config (non-sensitive)
-- Extends 00030: add referral keys to public-readable list
DROP POLICY IF EXISTS "Public can read non-sensitive settings" ON site_settings;
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
      'tawkto_property_id', 'tawkto_widget_id',
      'referral_enabled', 'referral_reward_type', 'referral_reward_amount', 'referral_reward_referred'
    )
  );
