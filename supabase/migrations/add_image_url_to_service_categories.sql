-- Add image_url column to service_categories
ALTER TABLE public.service_categories
  ADD COLUMN IF NOT EXISTS image_url text;
