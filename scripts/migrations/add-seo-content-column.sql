-- Run in Supabase SQL editor before: npm run scrape-menu-smart

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS seo_content JSONB;

CREATE INDEX IF NOT EXISTS restaurants_seo_content_null_idx
  ON restaurants (id)
  WHERE seo_content IS NULL;
