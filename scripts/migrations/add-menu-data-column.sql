-- Run in Supabase SQL editor before: npm run scrape-deliveroo-menu

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS menu_data JSONB;

CREATE INDEX IF NOT EXISTS restaurants_menu_data_null_idx
  ON restaurants (id)
  WHERE menu_data IS NULL;
