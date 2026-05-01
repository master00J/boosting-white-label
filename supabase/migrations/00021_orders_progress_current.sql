-- Add progress_current column to orders table for contextual progress tracking
-- This stores the raw current value (e.g. 50 kills, level 75) so the UI can show
-- "50 / 100 kills" or "Level 75 / 99" instead of just a percentage.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS progress_current INTEGER;
