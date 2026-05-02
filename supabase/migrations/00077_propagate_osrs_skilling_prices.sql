-- Copy bundled GP/XP rows onto every OSRS game that has none yet.
-- Template = whichever game_id currently has the most rows in osrs_skilling_prices.

WITH template_game AS (
  SELECT game_id
  FROM osrs_skilling_prices
  GROUP BY game_id
  ORDER BY COUNT(*) DESC
  LIMIT 1
)
INSERT INTO osrs_skilling_prices (
  game_id, skill_slug, method_id, method_name, level_min, level_max, gp_per_xp, sort_order
)
SELECT
  g.id,
  sp.skill_slug,
  sp.method_id,
  sp.method_name,
  sp.level_min,
  sp.level_max,
  sp.gp_per_xp,
  sp.sort_order
FROM games g
CROSS JOIN template_game tg
INNER JOIN osrs_skilling_prices sp ON sp.game_id = tg.game_id
WHERE g.slug IN ('oldschool-runescape', 'osrs')
  AND NOT EXISTS (
    SELECT 1 FROM osrs_skilling_prices x WHERE x.game_id = g.id LIMIT 1
  )
ON CONFLICT (game_id, skill_slug, method_id, level_min, level_max) DO NOTHING;
