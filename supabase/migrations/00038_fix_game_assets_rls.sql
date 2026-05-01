-- Fix RLS: use is_admin() SECURITY DEFINER function (bypasses profiles RLS)
DROP POLICY IF EXISTS "Admins can upload game assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update game assets" ON storage.objects;

CREATE POLICY "Admins can upload game assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'game-assets'
    AND public.is_admin()
  );

CREATE POLICY "Admins can update game assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'game-assets'
    AND public.is_admin()
  );
