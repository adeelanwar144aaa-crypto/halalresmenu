-- Run in Supabase SQL editor before: npm run generate-meta-tags

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS meta_title TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS menu_meta_title TEXT,
  ADD COLUMN IF NOT EXISTS menu_meta_description TEXT;
