-- Order ID format: [BRAND]-[GAME]-[SERVICE]-[ORDERNUMBER]
-- Add configurable short codes to games and services; brand in settings.

ALTER TABLE games ADD COLUMN IF NOT EXISTS order_code TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS order_code TEXT;

COMMENT ON COLUMN games.order_code IS 'Short code for order IDs, e.g. OSRS, RS3. Used in [BRAND]-[GAME]-[SERVICE]-[NUM].';
COMMENT ON COLUMN services.order_code IS 'Short code for order IDs, e.g. INF, FCP, TOA. Used in [BRAND]-[GAME]-[SERVICE]-[NUM].';

-- Site setting for default brand code (editable in admin)
INSERT INTO site_settings (key, value) VALUES
  ('order_id', '{"brand": "BST"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Function: generate next order number in format BRAND-GAME-SERVICE-000001
-- Codes are normalized to uppercase, alphanumeric only; defaults used if null/empty.
CREATE OR REPLACE FUNCTION get_next_order_number(
  p_brand TEXT,
  p_game_code TEXT,
  p_service_code TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand TEXT := COALESCE(NULLIF(TRIM(p_brand), ''), 'BST');
  v_game  TEXT := COALESCE(NULLIF(TRIM(p_game_code), ''), 'GME');
  v_svc   TEXT := COALESCE(NULLIF(TRIM(p_service_code), ''), 'SVC');
  v_num   TEXT;
BEGIN
  -- Uppercase and keep only alphanumeric (and hyphen if we allow it; for codes we want A-Z0-9 only)
  v_brand := UPPER(REGEXP_REPLACE(v_brand, '[^A-Za-z0-9]', '', 'g'));
  v_game  := UPPER(REGEXP_REPLACE(v_game,  '[^A-Za-z0-9]', '', 'g'));
  v_svc   := UPPER(REGEXP_REPLACE(v_svc,   '[^A-Za-z0-9]', '', 'g'));
  IF v_brand = '' THEN v_brand := 'BST'; END IF;
  IF v_game  = '' THEN v_game  := 'GME'; END IF;
  IF v_svc   = '' THEN v_svc   := 'SVC'; END IF;
  v_num := LPAD(nextval('order_number_seq')::TEXT, 6, '0');
  RETURN v_brand || '-' || v_game || '-' || v_svc || '-' || v_num;
END;
$$;

-- Allow service role and authenticated (for admin) to call
GRANT EXECUTE ON FUNCTION get_next_order_number(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_next_order_number(TEXT, TEXT, TEXT) TO authenticated;
