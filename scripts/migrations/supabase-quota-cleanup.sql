-- Supabase quota cleanup (run in SQL Editor; review sizes first).
-- Deleted-restaurant 301 map: public/deleted-redirects.json (2362 slugs) + GET /api/deleted-redirects.
-- restaurants_archive does not exist on project zseqhtepwrqpwcrrnjbw; no slug+city export required for redirects.

-- ========== 1) REPORT (before/after) ==========
SELECT pg_size_pretty(pg_database_size(current_database())) AS database_size;

SELECT
  c.relname AS table_name,
  pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
  pg_size_pretty(pg_relation_size(c.oid)) AS table_size,
  pg_size_pretty(pg_indexes_size(c.oid)) AS indexes_size
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY pg_total_relation_size(c.oid) DESC;

-- Optional: row counts for backup columns before drop
SELECT
  count(*) FILTER (WHERE photos_backup IS NOT NULL) AS photos_backup_rows,
  count(*) FILTER (WHERE menu_data_backup IS NOT NULL) AS menu_data_backup_rows
FROM public.restaurants;

-- ========== 2) DELETE / DROP ==========
DROP TABLE IF EXISTS public.restaurants_archive;

ALTER TABLE public.restaurants
  DROP COLUMN IF EXISTS photos_backup,
  DROP COLUMN IF EXISTS menu_data_backup;

-- Drop other project backup tables if present (no-op when missing)
DROP TABLE IF EXISTS public.restaurants_deleted_backup;
DROP TABLE IF EXISTS public.restaurants_cleanup_backup;

-- ========== 3) RECLAIM (locks tables; run off-peak) ==========
VACUUM FULL ANALYZE public.restaurants;

-- If you dropped a large archive table, also:
-- VACUUM FULL ANALYZE;

-- Re-check size:
SELECT pg_size_pretty(pg_database_size(current_database())) AS database_size_after;
