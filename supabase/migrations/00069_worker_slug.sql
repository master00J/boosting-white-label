-- Add slug column to workers table for SEO-friendly URLs
ALTER TABLE workers ADD COLUMN IF NOT EXISTS slug TEXT;

-- Generate slugs: slugified display_name + first 8 chars of UUID (guarantees uniqueness)
UPDATE workers w
SET slug = (
  SELECT
    lower(
      regexp_replace(
        regexp_replace(
          COALESCE(NULLIF(TRIM(p.display_name), ''), 'booster'),
          '[^a-zA-Z0-9 ]', '', 'g'
        ),
        '\s+', '-', 'g'
      )
    ) || '-' || substring(w.id::text, 1, 8)
  FROM profiles p
  WHERE p.id = w.profile_id
)
WHERE w.slug IS NULL AND w.profile_id IS NOT NULL;

-- Fallback for workers without a linked profile
UPDATE workers
SET slug = 'booster-' || substring(id::text, 1, 8)
WHERE slug IS NULL;

-- Add unique index
CREATE UNIQUE INDEX IF NOT EXISTS workers_slug_idx ON workers (slug);
