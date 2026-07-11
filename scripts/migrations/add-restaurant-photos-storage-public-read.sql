-- Allow public read access to restaurant photo objects in Supabase Storage.
-- Run in Supabase SQL Editor on the production project (Dashboard > Storage must show
-- the "restaurant-photos" bucket as Public).

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read restaurant photos" ON storage.objects;

CREATE POLICY "Public read restaurant photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'restaurant-photos');
