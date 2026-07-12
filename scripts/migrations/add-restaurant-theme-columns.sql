-- Per-restaurant theme colors (hex). Run in Supabase SQL editor before:
--   npm run backfill-restaurant-themes

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS primary_color TEXT,
  ADD COLUMN IF NOT EXISTS background_color TEXT,
  ADD COLUMN IF NOT EXISTS accent_color TEXT;

COMMENT ON COLUMN restaurants.primary_color IS 'CTA / brand mid color (hex), e.g. #1a7a4a';
COMMENT ON COLUMN restaurants.background_color IS 'Soft page wash background (hex)';
COMMENT ON COLUMN restaurants.accent_color IS 'Headline / strong text color (hex)';
