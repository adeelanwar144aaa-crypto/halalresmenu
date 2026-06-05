-- Run in Supabase SQL editor before: npm run enrich-google
-- Adds Google Places enrichment columns to restaurants

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS photos JSONB,
  ADD COLUMN IF NOT EXISTS reviews JSONB,
  ADD COLUMN IF NOT EXISTS opening_hours JSONB,
  ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 2),
  ADD COLUMN IF NOT EXISTS total_reviews INTEGER,
  ADD COLUMN IF NOT EXISTS dine_in BOOLEAN,
  ADD COLUMN IF NOT EXISTS takeaway BOOLEAN,
  ADD COLUMN IF NOT EXISTS delivery BOOLEAN,
  ADD COLUMN IF NOT EXISTS curbside_pickup BOOLEAN,
  ADD COLUMN IF NOT EXISTS outdoor_seating BOOLEAN,
  ADD COLUMN IF NOT EXISTS reservable BOOLEAN,
  ADD COLUMN IF NOT EXISTS serves_breakfast BOOLEAN,
  ADD COLUMN IF NOT EXISTS serves_lunch BOOLEAN,
  ADD COLUMN IF NOT EXISTS serves_dinner BOOLEAN,
  ADD COLUMN IF NOT EXISTS wheelchair_accessible BOOLEAN,
  ADD COLUMN IF NOT EXISTS price_level INTEGER,
  ADD COLUMN IF NOT EXISTS google_place_id TEXT,
  ADD COLUMN IF NOT EXISTS business_status TEXT;

CREATE INDEX IF NOT EXISTS restaurants_google_place_id_idx
  ON restaurants (google_place_id)
  WHERE google_place_id IS NOT NULL;
