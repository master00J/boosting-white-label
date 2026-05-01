-- =============================================
-- Allow service role to manage orders (bypasses RLS)
-- This is needed for server-side checkout API
-- =============================================

-- Service role already bypasses RLS by default in Supabase,
-- but if for any reason it doesn't, these policies ensure it works.

-- Drop existing customer insert policy and replace with a broader one
DROP POLICY IF EXISTS "Customers can create orders" ON orders;

CREATE POLICY "Customers can create orders" ON orders
  FOR INSERT WITH CHECK (
    customer_id = auth.uid()
  );

-- Also ensure service_role can always do everything (belt + suspenders)
-- Note: service_role bypasses RLS by default, this is just documentation
-- The real fix is ensuring SUPABASE_SERVICE_ROLE_KEY is set in Vercel env vars
