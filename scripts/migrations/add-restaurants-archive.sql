-- Archive for restaurants removed by cleanup (retain city for redirects).
CREATE TABLE IF NOT EXISTS public.restaurants_archive (
  LIKE public.restaurants INCLUDING ALL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'restaurants_archive'
      AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.restaurants_archive ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS restaurants_archive_slug_idx
  ON public.restaurants_archive (slug);

CREATE INDEX IF NOT EXISTS restaurants_archive_deleted_at_idx
  ON public.restaurants_archive (deleted_at DESC);
