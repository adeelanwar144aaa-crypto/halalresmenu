-- Run in Supabase SQL editor before live photo/menu upload from scripts/upload-to-r2.js

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS photos_backup JSONB,
  ADD COLUMN IF NOT EXISTS menu_data_backup JSONB;

COMMENT ON COLUMN restaurants.photos_backup IS 'Previous photos JSON array before manual R2 photo upload';
COMMENT ON COLUMN restaurants.menu_data_backup IS 'Previous menu_data before restaurant_menu parse upload';
