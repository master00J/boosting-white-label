-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_discord ON profiles(discord_id);
CREATE INDEX idx_profiles_referral ON profiles(referral_code);

CREATE INDEX idx_workers_tier ON workers(tier_id);
CREATE INDEX idx_workers_active ON workers(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_workers_profile ON workers(profile_id);

CREATE INDEX idx_games_slug ON games(slug);
CREATE INDEX idx_games_active ON games(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_services_game ON services(game_id);
CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_services_active ON services(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_worker ON orders(worker_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_game ON orders(game_id);
CREATE INDEX idx_orders_track_token ON orders(track_token);

CREATE INDEX idx_messages_order ON order_messages(order_id);

CREATE INDEX idx_reviews_worker ON reviews(worker_id);
CREATE INDEX idx_reviews_game ON reviews(game_id);
CREATE INDEX idx_reviews_public ON reviews(is_public) WHERE is_public = TRUE;

CREATE INDEX idx_coupons_code ON coupons(code);

CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_status ON tickets(status);

CREATE INDEX idx_notifications_profile ON notifications(profile_id);
CREATE INDEX idx_notifications_unread ON notifications(profile_id) WHERE is_read = FALSE;

CREATE INDEX idx_activity_actor ON activity_log(actor_id);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);

CREATE INDEX idx_affiliate_clicks_affiliate ON affiliate_clicks(affiliate_id);

CREATE INDEX idx_loyalty_profile ON loyalty_points(profile_id);
CREATE INDEX idx_loyalty_tier ON loyalty_points(tier_id);

CREATE INDEX idx_payouts_worker ON payouts(worker_id);
CREATE INDEX idx_payouts_status ON payouts(status);
