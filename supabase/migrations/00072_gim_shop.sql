-- Group Ironman Shop: shops and their items

CREATE TABLE IF NOT EXISTS gim_shops (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID        REFERENCES games(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gim_shop_items (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id      UUID           NOT NULL REFERENCES gim_shops(id) ON DELETE CASCADE,
  item_id      TEXT           NOT NULL,
  item_name    TEXT           NOT NULL,
  quantity     INTEGER        NOT NULL DEFAULT 1,
  price_each   NUMERIC(10,2)  NOT NULL DEFAULT 0,
  is_available BOOLEAN        NOT NULL DEFAULT true,
  sort_order   INTEGER        NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gim_shops_game    ON gim_shops(game_id);
CREATE INDEX IF NOT EXISTS idx_gim_shop_items_shop ON gim_shop_items(shop_id);

-- RLS
ALTER TABLE gim_shops      ENABLE ROW LEVEL SECURITY;
ALTER TABLE gim_shop_items ENABLE ROW LEVEL SECURITY;

-- Public: read active shops
DO $$ BEGIN
  CREATE POLICY "Public read active gim shops"
    ON gim_shops FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Public: read available items
DO $$ BEGIN
  CREATE POLICY "Public read available gim shop items"
    ON gim_shop_items FOR SELECT USING (is_available = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Grants
GRANT ALL ON TABLE gim_shops TO service_role;
GRANT ALL ON TABLE gim_shop_items TO service_role;

GRANT SELECT ON TABLE gim_shops TO anon, authenticated;
GRANT SELECT ON TABLE gim_shop_items TO anon, authenticated;
