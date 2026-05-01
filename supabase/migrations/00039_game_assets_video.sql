-- Extend game-assets bucket to allow hero background videos (mp4, webm)
UPDATE storage.buckets
SET
  allowed_mime_types = ARRAY[
    'image/png', 'image/jpeg', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm'
  ],
  file_size_limit = 104857600  -- 100MB (videos are larger than images)
WHERE id = 'game-assets';
