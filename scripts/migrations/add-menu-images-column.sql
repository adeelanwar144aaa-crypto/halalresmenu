-- Run in Supabase SQL editor before: npm run upload-to-r2

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS menu_images JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS images_uploaded_at TIMESTAMPTZ;

COMMENT ON COLUMN restaurants.menu_images IS 'Public URLs of menu page images (R2), JSON string array';
COMMENT ON COLUMN restaurants.images_uploaded_at IS 'Set when manual/R2 menu images + menu_data upload completed';
