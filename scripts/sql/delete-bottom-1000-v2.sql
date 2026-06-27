-- DESTRUCTIVE: Delete bottom-1,000 restaurants (v2: sole-city protected, sparse bonus).
-- Run in Supabase Dashboard → SQL Editor when REST API is quota-blocked (402).
--
-- BEFORE RUNNING:
--   1. Run the PREVIEW section first and review candidates.
--   2. Export slug list for Storage cleanup (section EXPORT_STORAGE_PATHS).
--   3. Run the DELETE section in a single transaction.
--
-- Indexing status: not tracked in this project — completeness v2 only.

-- ═══════════════════════════════════════════════════════════════════════════
-- PREVIEW: bottom 1,000 candidates (read-only)
-- ═══════════════════════════════════════════════════════════════════════════
/*
WITH params AS (
  SELECT 5 AS sparse_city_max, 5 AS min_city_peers, 3 AS required_photos, 12 AS sparse_city_bonus
),
city_counts AS (
  SELECT lower(btrim(city)) AS city_key, COUNT(*)::int AS restaurants_in_city
  FROM restaurants
  WHERE city IS NOT NULL AND btrim(city) <> '' AND COALESCE(is_active, true) = true
  GROUP BY lower(btrim(city))
),
photo_counts AS (
  SELECT r.id,
    (SELECT COUNT(*)::int FROM jsonb_array_elements_text(
      CASE WHEN r.photos IS NULL THEN '[]'::jsonb
           WHEN jsonb_typeof(r.photos) = 'array' THEN r.photos ELSE '[]'::jsonb END
    ) AS elem(url)
    WHERE NULLIF(btrim(url), '') IS NOT NULL AND url ~* '^https?://') AS valid_photo_url_count
  FROM restaurants r
),
scored AS (
  SELECT r.id, r.slug, r.name, r.city, cc.restaurants_in_city, pc.valid_photo_url_count,
    CASE WHEN pc.valid_photo_url_count >= p.required_photos THEN 30
         WHEN pc.valid_photo_url_count = 2 THEN 15
         WHEN pc.valid_photo_url_count = 1 THEN 5 ELSE 0 END AS photo_pts,
    (CASE WHEN COALESCE(length(btrim(r.description)), 0) >= 40 THEN 10 ELSE 0 END
     + CASE WHEN r.menu_data IS NOT NULL AND jsonb_typeof(r.menu_data->'categories')='array'
            AND jsonb_array_length(r.menu_data->'categories')>0
            AND EXISTS (SELECT 1 FROM jsonb_array_elements(r.menu_data->'categories') cat
                        WHERE jsonb_array_length(COALESCE(cat->'items','[]'::jsonb))>0) THEN 10 ELSE 0 END
     + CASE WHEN COALESCE(length(btrim(r.seo_content->>'about_section')),0)>=80 THEN 5 ELSE 0 END
     + CASE WHEN COALESCE(length(btrim(r.seo_content->>'meta_description')),0)>=40 THEN 5 ELSE 0 END) AS text_pts,
    CASE WHEN r.rating IS NOT NULL AND r.rating > 0 THEN 15 ELSE 0 END
    + CASE WHEN r.total_reviews IS NOT NULL AND r.total_reviews > 0 THEN 15 ELSE 0 END AS rating_pts,
    CASE WHEN cc.restaurants_in_city IS NULL THEN 0
         WHEN cc.restaurants_in_city > p.min_city_peers THEN 15
         WHEN cc.restaurants_in_city >= 2 THEN 8 ELSE 0 END AS city_pts,
    COALESCE(cc.restaurants_in_city, 0) = 1 AS is_sole_city_restaurant,
    CASE WHEN cc.restaurants_in_city BETWEEN 2 AND p.sparse_city_max THEN p.sparse_city_bonus ELSE 0 END AS city_protection_bonus
  FROM restaurants r
  CROSS JOIN params p
  LEFT JOIN city_counts cc ON cc.city_key = lower(btrim(r.city))
  LEFT JOIN photo_counts pc ON pc.id = r.id
  WHERE COALESCE(r.is_active, true) = true
),
with_scores AS (
  SELECT *, (photo_pts + text_pts + rating_pts + city_pts) AS completeness_score,
    (photo_pts + text_pts + rating_pts + city_pts + city_protection_bonus) AS adjusted_score
  FROM scored
),
eligible AS (SELECT * FROM with_scores WHERE NOT is_sole_city_restaurant),
ranked AS (
  SELECT *, ROW_NUMBER() OVER (
    ORDER BY adjusted_score ASC, valid_photo_url_count ASC,
             COALESCE(total_reviews,0) ASC, restaurants_in_city ASC NULLS FIRST, slug ASC
  ) AS deletion_rank FROM eligible
)
SELECT COUNT(*) AS total_active FROM restaurants WHERE COALESCE(is_active,true)=true;
-- Then: SELECT * FROM ranked WHERE deletion_rank <= 1000 ORDER BY deletion_rank;
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- EXPORT_STORAGE_PATHS: run before DELETE — use paths in Dashboard → Storage
-- ═══════════════════════════════════════════════════════════════════════════
/*
WITH ... same CTEs as DELETE below ...
SELECT dc.slug,
       'restaurant-photos/' || dc.slug || '/photo-' || gs.i || '.jpg' AS storage_path
FROM deletion_candidates dc
CROSS JOIN generate_series(1, 3) AS gs(i)
ORDER BY dc.slug, gs.i;
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- DELETE (transaction)
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TEMP TABLE deletion_candidates ON COMMIT DROP AS
WITH params AS (
  SELECT 5 AS sparse_city_max, 5 AS min_city_peers, 3 AS required_photos, 12 AS sparse_city_bonus
),
city_counts AS (
  SELECT lower(btrim(city)) AS city_key, COUNT(*)::int AS restaurants_in_city
  FROM restaurants
  WHERE city IS NOT NULL AND btrim(city) <> '' AND COALESCE(is_active, true) = true
  GROUP BY lower(btrim(city))
),
photo_counts AS (
  SELECT r.id,
    (SELECT COUNT(*)::int FROM jsonb_array_elements_text(
      CASE WHEN r.photos IS NULL THEN '[]'::jsonb
           WHEN jsonb_typeof(r.photos) = 'array' THEN r.photos ELSE '[]'::jsonb END
    ) AS elem(url)
    WHERE NULLIF(btrim(url), '') IS NOT NULL AND url ~* '^https?://') AS valid_photo_url_count
  FROM restaurants r
),
scored AS (
  SELECT r.id, r.slug,
    CASE WHEN pc.valid_photo_url_count >= p.required_photos THEN 30
         WHEN pc.valid_photo_url_count = 2 THEN 15
         WHEN pc.valid_photo_url_count = 1 THEN 5 ELSE 0 END AS photo_pts,
    (CASE WHEN COALESCE(length(btrim(r.description)), 0) >= 40 THEN 10 ELSE 0 END
     + CASE WHEN r.menu_data IS NOT NULL AND jsonb_typeof(r.menu_data->'categories')='array'
            AND jsonb_array_length(r.menu_data->'categories')>0
            AND EXISTS (SELECT 1 FROM jsonb_array_elements(r.menu_data->'categories') cat
                        WHERE jsonb_array_length(COALESCE(cat->'items','[]'::jsonb))>0) THEN 10 ELSE 0 END
     + CASE WHEN COALESCE(length(btrim(r.seo_content->>'about_section')),0)>=80 THEN 5 ELSE 0 END
     + CASE WHEN COALESCE(length(btrim(r.seo_content->>'meta_description')),0)>=40 THEN 5 ELSE 0 END) AS text_pts,
    CASE WHEN r.rating IS NOT NULL AND r.rating > 0 THEN 15 ELSE 0 END
    + CASE WHEN r.total_reviews IS NOT NULL AND r.total_reviews > 0 THEN 15 ELSE 0 END AS rating_pts,
    CASE WHEN cc.restaurants_in_city IS NULL THEN 0
         WHEN cc.restaurants_in_city > p.min_city_peers THEN 15
         WHEN cc.restaurants_in_city >= 2 THEN 8 ELSE 0 END AS city_pts,
    COALESCE(cc.restaurants_in_city, 0) = 1 AS is_sole_city_restaurant,
    CASE WHEN cc.restaurants_in_city BETWEEN 2 AND p.sparse_city_max THEN p.sparse_city_bonus ELSE 0 END AS city_protection_bonus,
    pc.valid_photo_url_count,
    r.total_reviews,
    r.slug AS sort_slug
  FROM restaurants r
  CROSS JOIN params p
  LEFT JOIN city_counts cc ON cc.city_key = lower(btrim(r.city))
  LEFT JOIN photo_counts pc ON pc.id = r.id
  WHERE COALESCE(r.is_active, true) = true
),
with_scores AS (
  SELECT id, slug,
    (photo_pts + text_pts + rating_pts + city_pts + city_protection_bonus) AS adjusted_score,
    valid_photo_url_count, total_reviews, sort_slug, is_sole_city_restaurant
  FROM scored
),
eligible AS (SELECT * FROM with_scores WHERE NOT is_sole_city_restaurant),
ranked AS (
  SELECT id, slug, adjusted_score,
    ROW_NUMBER() OVER (
      ORDER BY adjusted_score ASC, valid_photo_url_count ASC,
               COALESCE(total_reviews, 0) ASC, sort_slug ASC
    ) AS deletion_rank
  FROM eligible
)
SELECT id, slug, adjusted_score, deletion_rank
FROM ranked
WHERE deletion_rank <= 1000;

-- Child tables (ignore if table missing — comment out as needed)
DELETE FROM menu_items WHERE restaurant_id IN (SELECT id FROM deletion_candidates);
DELETE FROM menu_categories WHERE restaurant_id IN (SELECT id FROM deletion_candidates);
DELETE FROM restaurant_photos WHERE restaurant_id IN (SELECT id FROM deletion_candidates);
DELETE FROM reviews WHERE restaurant_id IN (SELECT id FROM deletion_candidates);

DELETE FROM restaurants WHERE id IN (SELECT id FROM deletion_candidates);

-- Summary
SELECT
  (SELECT COUNT(*) FROM deletion_candidates) AS deleted_count,
  (SELECT COUNT(*) FROM restaurants WHERE COALESCE(is_active, true) = true) AS active_restaurants_remaining,
  (SELECT MIN(adjusted_score) FROM deletion_candidates) AS min_deleted_score,
  (SELECT MAX(adjusted_score) FROM deletion_candidates) AS max_deleted_score;

COMMIT;
