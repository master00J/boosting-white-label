-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE user_role AS ENUM ('customer', 'worker', 'admin', 'super_admin');

CREATE TYPE order_status AS ENUM (
  'pending_payment',
  'paid',
  'queued',
  'claimed',
  'in_progress',
  'paused',
  'completed',
  'cancelled',
  'refunded',
  'disputed'
);

CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- NOTE: service_type is NOT an enum — categories are dynamic via service_categories table.
-- NOTE: worker tier is NOT an enum — tiers are dynamic via worker_tiers table.

CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');

CREATE TYPE ticket_status AS ENUM ('open', 'awaiting_reply', 'in_progress', 'resolved', 'closed');

CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
