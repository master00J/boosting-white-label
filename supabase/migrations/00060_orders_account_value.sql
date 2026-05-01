-- =============================================
-- Order account value (customer-stated value on account)
-- Used to gate claim: booster can only claim if available deposit >= account_value.
-- When claimed, this value is "held" (available deposit = deposit_paid - sum(account_value of active orders)).
-- =============================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS account_value DECIMAL(10,2) DEFAULT NULL;

COMMENT ON COLUMN orders.account_value IS 'Value on customer account (USD); booster must have available deposit >= this to claim; held until order completes/cancels.';
