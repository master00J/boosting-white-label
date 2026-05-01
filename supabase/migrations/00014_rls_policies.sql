-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT role IN ('admin', 'super_admin') FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: is worker
CREATE OR REPLACE FUNCTION is_worker()
RETURNS BOOLEAN AS $$
  SELECT role IN ('worker', 'admin', 'super_admin') FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── PROFILES ───
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (is_admin());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (is_admin());

-- ─── WORKER TIERS ───
CREATE POLICY "Anyone can view worker tiers" ON worker_tiers
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage worker tiers" ON worker_tiers
  FOR ALL USING (is_admin());

-- ─── WORKERS ───
CREATE POLICY "Workers can view own record" ON workers
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Admins can view all workers" ON workers
  FOR SELECT USING (is_admin());

CREATE POLICY "Public can view verified active workers" ON workers
  FOR SELECT USING (is_verified = true AND is_active = true);

CREATE POLICY "Workers can update own record" ON workers
  FOR UPDATE USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Admins can manage all workers" ON workers
  FOR ALL USING (is_admin());

-- ─── GAMES ───
CREATE POLICY "Anyone can view active games" ON games
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can view all games" ON games
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can manage games" ON games
  FOR ALL USING (is_admin());

-- ─── SERVICE CATEGORIES ───
CREATE POLICY "Anyone can view active categories" ON service_categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON service_categories
  FOR ALL USING (is_admin());

-- ─── SERVICES ───
CREATE POLICY "Anyone can view active services" ON services
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can view all services" ON services
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can manage services" ON services
  FOR ALL USING (is_admin());

-- ─── ORDERS ───
CREATE POLICY "Customers can view own orders" ON orders
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Workers can view claimed orders" ON orders
  FOR SELECT USING (
    worker_id IN (SELECT id FROM workers WHERE profile_id = auth.uid())
  );

CREATE POLICY "Workers can view available orders" ON orders
  FOR SELECT USING (
    status IN ('queued') AND is_worker()
  );

CREATE POLICY "Admins can view all orders" ON orders
  FOR SELECT USING (is_admin());

CREATE POLICY "Customers can create orders" ON orders
  FOR INSERT WITH CHECK (customer_id = auth.uid() OR customer_id IS NULL);

CREATE POLICY "Workers can update claimed orders" ON orders
  FOR UPDATE USING (
    worker_id IN (SELECT id FROM workers WHERE profile_id = auth.uid())
  );

CREATE POLICY "Admins can manage all orders" ON orders
  FOR ALL USING (is_admin());

-- ─── ORDER MESSAGES ───
CREATE POLICY "Order participants can view messages" ON order_messages
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders
      WHERE customer_id = auth.uid()
         OR worker_id IN (SELECT id FROM workers WHERE profile_id = auth.uid())
    )
    OR is_admin()
  );

CREATE POLICY "Order participants can send messages" ON order_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    order_id IN (
      SELECT id FROM orders
      WHERE customer_id = auth.uid()
         OR worker_id IN (SELECT id FROM workers WHERE profile_id = auth.uid())
    )
    OR is_admin()
  );

-- ─── REVIEWS ───
CREATE POLICY "Anyone can view public reviews" ON reviews
  FOR SELECT USING (is_public = true);

CREATE POLICY "Admins can view all reviews" ON reviews
  FOR SELECT USING (is_admin());

CREATE POLICY "Customers can create reviews for own orders" ON reviews
  FOR INSERT WITH CHECK (
    customer_id = auth.uid() AND
    order_id IN (SELECT id FROM orders WHERE customer_id = auth.uid() AND status = 'completed')
  );

CREATE POLICY "Admins can manage reviews" ON reviews
  FOR ALL USING (is_admin());

-- ─── NOTIFICATIONS ───
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (profile_id = auth.uid());

-- ─── SITE SETTINGS ───
CREATE POLICY "Anyone can read site settings" ON site_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can update site settings" ON site_settings
  FOR UPDATE USING (is_admin());

-- ─── TICKETS ───
CREATE POLICY "Customers can view own tickets" ON tickets
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Admins can view all tickets" ON tickets
  FOR SELECT USING (is_admin());

CREATE POLICY "Customers can create tickets" ON tickets
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Admins can manage tickets" ON tickets
  FOR ALL USING (is_admin());

-- ─── TICKET MESSAGES ───
CREATE POLICY "Ticket participants can view messages" ON ticket_messages
  FOR SELECT USING (
    ticket_id IN (SELECT id FROM tickets WHERE customer_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "Ticket participants can send messages" ON ticket_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND (
      ticket_id IN (SELECT id FROM tickets WHERE customer_id = auth.uid())
      OR is_admin()
    )
  );

-- ─── PAYOUTS ───
CREATE POLICY "Workers can view own payouts" ON payouts
  FOR SELECT USING (
    worker_id IN (SELECT id FROM workers WHERE profile_id = auth.uid())
  );

CREATE POLICY "Admins can manage payouts" ON payouts
  FOR ALL USING (is_admin());

-- ─── LOYALTY ───
CREATE POLICY "Users can view own loyalty points" ON loyalty_points
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Anyone can view loyalty tiers" ON loyalty_tiers
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view active rewards" ON loyalty_rewards
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage loyalty" ON loyalty_tiers
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can manage rewards" ON loyalty_rewards
  FOR ALL USING (is_admin());

-- ─── ACTIVITY LOG ───
CREATE POLICY "Admins can view activity log" ON activity_log
  FOR SELECT USING (is_admin());

-- ─── API KEYS ───
CREATE POLICY "Admins can manage API keys" ON api_keys
  FOR ALL USING (is_admin());

-- ─── COUPONS ───
CREATE POLICY "Anyone can view active coupons" ON coupons
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage coupons" ON coupons
  FOR ALL USING (is_admin());

-- ─── AFFILIATES ───
CREATE POLICY "Affiliates can view own record" ON affiliates
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Admins can manage affiliates" ON affiliates
  FOR ALL USING (is_admin());
