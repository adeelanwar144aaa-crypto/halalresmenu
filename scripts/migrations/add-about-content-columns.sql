-- Run in Supabase SQL editor before about.txt upload + Claude content generation.

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS about_raw TEXT,
  ADD COLUMN IF NOT EXISTS about_content JSONB,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_meta_description TEXT,
  ADD COLUMN IF NOT EXISTS content_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS images_uploaded_at TIMESTAMPTZ;

COMMENT ON COLUMN restaurants.about_raw IS 'Raw about.txt from manual upload pipeline';
COMMENT ON COLUMN restaurants.about_content IS 'Generated guide JSON: { intro, sections: [{ heading, body }] }';
COMMENT ON COLUMN restaurants.seo_title IS 'Claude-generated overview <title> when set';
COMMENT ON COLUMN restaurants.seo_meta_description IS 'Claude-generated meta description when set';
COMMENT ON COLUMN restaurants.content_generated_at IS 'When about_content was last generated';
COMMENT ON COLUMN restaurants.images_uploaded_at IS 'When R2 photos/menu/about upload last ran';
