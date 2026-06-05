-- Run in Supabase SQL editor before: npm run download-photos-mosques
-- Stores permanent nearby mosque data (no repeat Google API calls)

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS nearby_mosques JSONB;
