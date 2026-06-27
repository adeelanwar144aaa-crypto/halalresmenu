-- STEP 1 v2 (read-only): Bottom 1,000 deletion candidates with city protection.
-- Run in Supabase Dashboard → SQL Editor.
--
-- City rules:
--   • 1 active restaurant in city → EXCLUDED (sole-town protection)
--   • 2–5 in city → +12 ranking bonus (sparse-city protection)
--   • 6+ in city → no bonus; original scoring unchanged
--
-- Outputs (in order): summary stats, then bottom-1,000 list.

WITH params AS (
  SELECT
    5 AS sparse_city_max,     -- 2..5 restaurants = sparse protected band
    5 AS min_city_peers,      -- unchanged threshold for full city_pts (15)
    3 AS required_photos,
    12 AS sparse_city_bonus   -- points added to adjusted_score for 2–5 band
),

city_counts AS (
  SELECT
    lower(btrim(city)) AS city_key,
    COUNT(*)::int AS restaurants_in_city
  FROM restaurants
  WHERE city IS NOT NULL
    AND btrim(city) <> ''
    AND COALESCE(is_active, true) = true
  GROUP BY lower(btrim(city))
),

photo_counts AS (
  SELECT
    r.id,
    (
      SELECT COUNT(*)::int
      FROM jsonb_array_elements_text(
        CASE
          WHEN r.photos IS NULL THEN '[]'::jsonb
          WHEN jsonb_typeof(r.photos) = 'array' THEN r.photos
          ELSE '[]'::jsonb
        END
      ) AS elem(url)
      WHERE NULLIF(btrim(url), '') IS NOT NULL
        AND url ~* '^https?://'
    ) AS valid_photo_url_count
  FROM restaurants r
),

scored AS (
  SELECT
    r.id,
    r.slug,
    r.name,
    r.city,
    r.rating,
    r.total_reviews,
    cc.restaurants_in_city,
    pc.valid_photo_url_count,

    CASE
      WHEN pc.valid_photo_url_count >= p.required_photos THEN 30
      WHEN pc.valid_photo_url_count = 2 THEN 15
      WHEN pc.valid_photo_url_count = 1 THEN 5
      ELSE 0
    END AS photo_pts,

    (
      CASE WHEN COALESCE(length(btrim(r.description)), 0) >= 40 THEN 10 ELSE 0 END
      + CASE
          WHEN r.menu_data IS NOT NULL
            AND jsonb_typeof(r.menu_data -> 'categories') = 'array'
            AND jsonb_array_length(r.menu_data -> 'categories') > 0
            AND EXISTS (
              SELECT 1
              FROM jsonb_array_elements(r.menu_data -> 'categories') AS cat
              WHERE jsonb_array_length(COALESCE(cat -> 'items', '[]'::jsonb)) > 0
            )
          THEN 10
          ELSE 0
        END
      + CASE
          WHEN COALESCE(length(btrim(r.seo_content ->> 'about_section')), 0) >= 80 THEN 5
          ELSE 0
        END
      + CASE
          WHEN COALESCE(length(btrim(r.seo_content ->> 'meta_description')), 0) >= 40 THEN 5
          ELSE 0
        END
    ) AS text_pts,

    CASE WHEN r.rating IS NOT NULL AND r.rating > 0 THEN 15 ELSE 0 END
    + CASE WHEN r.total_reviews IS NOT NULL AND r.total_reviews > 0 THEN 15 ELSE 0 END
    AS rating_pts,

    CASE
      WHEN cc.restaurants_in_city IS NULL THEN 0
      WHEN cc.restaurants_in_city > p.min_city_peers THEN 15
      WHEN cc.restaurants_in_city >= 2 THEN 8
      ELSE 0
    END AS city_pts,

    COALESCE(cc.restaurants_in_city, 0) = 1 AS is_sole_city_restaurant,

    CASE
      WHEN cc.restaurants_in_city BETWEEN 2 AND p.sparse_city_max THEN p.sparse_city_bonus
      ELSE 0
    END AS city_protection_bonus

  FROM restaurants r
  CROSS JOIN params p
  LEFT JOIN city_counts cc ON cc.city_key = lower(btrim(r.city))
  LEFT JOIN photo_counts pc ON pc.id = r.id
  WHERE COALESCE(r.is_active, true) = true
),

with_scores AS (
  SELECT
    s.*,
    (s.photo_pts + s.text_pts + s.rating_pts + s.city_pts) AS completeness_score,
    (s.photo_pts + s.text_pts + s.rating_pts + s.city_pts + s.city_protection_bonus) AS adjusted_score
  FROM scored s
),

-- Old list: no sole exclusion, no sparse bonus (for comparison)
old_ranked AS (
  SELECT
    w.*,
    ROW_NUMBER() OVER (
      ORDER BY
        w.completeness_score ASC,
        w.valid_photo_url_count ASC,
        COALESCE(w.total_reviews, 0) ASC,
        COALESCE(w.rating, 0) ASC,
        w.restaurants_in_city ASC NULLS FIRST,
        w.slug ASC
    ) AS old_deletion_rank
  FROM with_scores w
),

old_bottom_1000 AS (
  SELECT id, slug, is_sole_city_restaurant, old_deletion_rank
  FROM old_ranked
  WHERE old_deletion_rank <= 1000
),

-- New list: exclude sole-city; rank by adjusted_score
eligible AS (
  SELECT *
  FROM with_scores
  WHERE NOT is_sole_city_restaurant
),

new_ranked AS (
  SELECT
    e.*,
    ROW_NUMBER() OVER (
      ORDER BY
        e.adjusted_score ASC,
        e.completeness_score ASC,
        e.valid_photo_url_count ASC,
        COALESCE(e.total_reviews, 0) ASC,
        COALESCE(e.rating, 0) ASC,
        e.restaurants_in_city ASC NULLS FIRST,
        e.slug ASC
    ) AS new_deletion_rank
  FROM eligible e
),

new_bottom_1000 AS (
  SELECT * FROM new_ranked WHERE new_deletion_rank <= 1000
),

sole_protected AS (
  SELECT COUNT(*)::int AS sole_restaurant_count
  FROM with_scores
  WHERE is_sole_city_restaurant
),

sole_would_have_been_cut AS (
  SELECT COUNT(*)::int AS sole_in_old_bottom_1000
  FROM old_bottom_1000
  WHERE is_sole_city_restaurant
),

sparse_in_new_bottom AS (
  SELECT COUNT(*)::int AS sparse_2_to_5_in_new_bottom
  FROM new_bottom_1000
  WHERE restaurants_in_city BETWEEN 2 AND (SELECT sparse_city_max FROM params)
)

-- ── Result set 1: summary (single row) ─────────────────────────────────────
SELECT
  'SUMMARY' AS result_type,
  NULL::uuid AS id,
  NULL::text AS slug,
  NULL::text AS name,
  NULL::text AS city,
  (SELECT COUNT(*)::int FROM restaurants WHERE COALESCE(is_active, true) = true) AS total_active_restaurants,
  (SELECT sole_restaurant_count FROM sole_protected) AS sole_city_restaurants_protected,
  (SELECT sole_in_old_bottom_1000 FROM sole_would_have_been_cut) AS sole_removed_from_old_bottom_1000,
  (SELECT MIN(adjusted_score) FROM new_bottom_1000) AS new_bottom_1000_min_score,
  (SELECT MAX(adjusted_score) FROM new_bottom_1000) AS new_bottom_1000_max_score,
  (SELECT sparse_2_to_5_in_new_bottom FROM sparse_in_new_bottom) AS sparse_cities_still_in_bottom_1000,
  NULL::numeric AS rating,
  NULL::int AS total_reviews,
  NULL::int AS restaurants_in_city,
  NULL::int AS valid_photo_url_count,
  NULL::int AS photo_pts,
  NULL::int AS text_pts,
  NULL::int AS rating_pts,
  NULL::int AS city_pts,
  NULL::int AS city_protection_bonus,
  NULL::int AS completeness_score,
  NULL::int AS adjusted_score,
  NULL::bigint AS deletion_rank

UNION ALL

-- ── Result set 2: bottom 1,000 (revised) ───────────────────────────────────
SELECT
  'CANDIDATE' AS result_type,
  id,
  slug,
  name,
  city,
  NULL::int,
  NULL::int,
  NULL::int,
  NULL::int,
  NULL::int,
  rating,
  total_reviews,
  restaurants_in_city,
  valid_photo_url_count,
  photo_pts,
  text_pts,
  rating_pts,
  city_pts,
  city_protection_bonus,
  completeness_score,
  adjusted_score,
  new_deletion_rank AS deletion_rank
FROM new_bottom_1000

ORDER BY
  CASE result_type WHEN 'SUMMARY' THEN 0 ELSE 1 END,
  deletion_rank NULLS FIRST;
