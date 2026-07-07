-- Allow public (anon) read access to published restaurant directory rows.
-- Run in Supabase SQL Editor on the target project.

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for active restaurants" ON public.restaurants;

CREATE POLICY "Public read access for active restaurants"
ON public.restaurants
FOR SELECT
TO anon, authenticated
USING (COALESCE(is_active, true) = true);
