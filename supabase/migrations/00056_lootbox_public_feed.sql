-- Public feed function for recent lootbox opens (anonymised — no PII)
CREATE OR REPLACE FUNCTION public_lootbox_feed(lim INT DEFAULT 20)
RETURNS TABLE(
  box_name    TEXT,
  prize_name  TEXT,
  prize_rarity TEXT,
  prize_value  DECIMAL,
  prize_type   TEXT,
  opened_at    TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lb.name                                      AS box_name,
    (o.prize_snapshot->>'name')::TEXT            AS prize_name,
    (o.prize_snapshot->>'rarity')::TEXT          AS prize_rarity,
    (o.prize_snapshot->>'prize_value')::DECIMAL  AS prize_value,
    (o.prize_snapshot->>'prize_type')::TEXT      AS prize_type,
    o.created_at                                 AS opened_at
  FROM lootbox_opens o
  JOIN lootboxes lb ON lb.id = o.lootbox_id
  ORDER BY o.created_at DESC
  LIMIT lim;
$$;

GRANT EXECUTE ON FUNCTION public_lootbox_feed TO anon, authenticated;
