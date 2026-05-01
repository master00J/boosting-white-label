-- Storage bucket for game assets (logos, banners) and hero images
-- Used by: games admin, hero banners admin
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'game-assets',
  'game-assets',
  true,
  52428800, -- 50MB max
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Admins can upload (logos/, banners/, hero/)
CREATE POLICY "Admins can upload game assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'game-assets'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update game assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'game-assets'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Public can view (storefront needs to show images)
CREATE POLICY "Public can view game assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'game-assets');
