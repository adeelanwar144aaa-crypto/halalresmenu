-- STEP 1 diagnostic: factor-by-factor breakdown for sample deletion candidates.
-- Run in Supabase SQL Editor after reviewing restaurant-completeness-bottom-1000.sql.
--
-- Default: worst 3 in the bottom-1,000 list (ranks 1–3).
-- To inspect specific slugs instead, set use_slugs = true and edit slug_filter.

WITH params AS (
  SELECT
    5 AS min_city_peers,
    3 AS required_photos,
    false AS use_slugs,  -- true = ignore rank filter; use slug_filter only
    ARRAY[]::text[] AS slug_filter  -- e.g. ARRAY['some-slug','another-slug']
),

city_counts AS (
  SELECT
    lower(btrim(city)) AS city_key,
    COUNT(*)::int AS restaurants_in_city
  FROM restaurants
  WHERE city IS NOT NULL AND btrim(city) <> ''
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

factors AS (
  SELECT
    r.id,
    r.slug,
    r.name,
    r.city,
    r.rating,
    r.total_reviews,
    cc.restaurants_in_city,
    pc.valid_photo_url_count,
    p.min_city_peers,
    p.required_photos,

    COALESCE(length(btrim(r.description)), 0) AS description_len,
    (
      r.menu_data IS NOT NULL
      AND jsonb_typeof(r.menu_data -> 'categories') = 'array'
      AND jsonb_array_length(r.menu_data -> 'categories') > 0
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(r.menu_data -> 'categories') AS cat
        WHERE jsonb_array_length(COALESCE(cat -> 'items', '[]'::jsonb)) > 0
      )
    ) AS has_menu_items,
    COALESCE(length(btrim(r.seo_content ->> 'about_section')), 0) AS seo_about_len,
    COALESCE(length(btrim(r.seo_content ->> 'meta_description')), 0) AS seo_meta_len,

    CASE
      WHEN pc.valid_photo_url_count >= p.required_photos THEN 30
      WHEN pc.valid_photo_url_count = 2 THEN 15
      WHEN pc.valid_photo_url_count = 1 THEN 5
      ELSE 0
    END AS photo_pts,

    CASE WHEN COALESCE(length(btrim(r.description)), 0) >= 40 THEN 10 ELSE 0 END AS desc_pts,
    CASE
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
    END AS menu_pts,
    CASE WHEN COALESCE(length(btrim(r.seo_content ->> 'about_section')), 0) >= 80 THEN 5 ELSE 0 END AS seo_about_pts,
    CASE WHEN COALESCE(length(btrim(r.seo_content ->> 'meta_description')), 0) >= 40 THEN 5 ELSE 0 END AS seo_meta_pts,

    CASE WHEN r.rating IS NOT NULL AND r.rating > 0 THEN 15 ELSE 0 END AS rating_pts,
    CASE WHEN r.total_reviews IS NOT NULL AND r.total_reviews > 0 THEN 15 ELSE 0 END AS reviews_pts,

    CASE
      WHEN cc.restaurants_in_city IS NULL THEN 0
      WHEN cc.restaurants_in_city > p.min_city_peers THEN 15
      WHEN cc.restaurants_in_city >= 2 THEN 8
      ELSE 0
    END AS city_pts

  FROM restaurants r
  CROSS JOIN params p
  LEFT JOIN city_counts cc ON cc.city_key = lower(btrim(r.city))
  LEFT JOIN photo_counts pc ON pc.id = r.id
),

scored AS (
  SELECT
    f.*,
    (f.desc_pts + f.menu_pts + f.seo_about_pts + f.seo_meta_pts) AS text_pts,
    (f.rating_pts + f.reviews_pts) AS rating_pts_total,
    (f.photo_pts + f.desc_pts + f.menu_pts + f.seo_about_pts + f.seo_meta_pts + f.rating_pts + f.reviews_pts + f.city_pts) AS completeness_score
  FROM factors f
),

ranked AS (
  SELECT
    s.*,
    ROW_NUMBER() OVER (
      ORDER BY
        s.completeness_score ASC,
        s.valid_photo_url_count ASC,
        COALESCE(s.total_reviews, 0) ASC,
        COALESCE(s.rating, 0) ASC,
        s.restaurants_in_city ASC NULLS FIRST,
        s.slug ASC
    ) AS deletion_rank
  FROM scored s
),

bottom_1000 AS (
  SELECT * FROM ranked WHERE deletion_rank <= 1000
),

picked AS (
  SELECT b.*
  FROM bottom_1000 b
  CROSS JOIN params p
  WHERE
    (p.use_slugs AND b.slug = ANY(p.slug_filter))
    OR (NOT p.use_slugs AND b.deletion_rank IN (1, 2, 3))
)

SELECT
  deletion_rank,
  slug,
  name,
  city,
  completeness_score,
  valid_photo_url_count AS photo_urls,
  restaurants_in_city,
  rating,
  total_reviews,

  -- Points earned vs max (what drove the score down)
  photo_pts,
  30 - photo_pts AS photos_points_lost,
  text_pts,
  25 - text_pts AS text_points_lost,
  rating_pts_total AS rating_pts,
  30 - rating_pts_total AS rating_points_lost,
  city_pts,
  15 - city_pts AS city_points_lost,

  -- Sub-factor flags (what is missing)
  CASE
    WHEN valid_photo_url_count >= required_photos THEN 'OK: 3 photos'
    WHEN valid_photo_url_count = 2 THEN 'MISSING: 1 of 3 photos'
    WHEN valid_photo_url_count = 1 THEN 'MISSING: 2 of 3 photos'
    ELSE 'MISSING: all photos'
  END AS photo_status,

  CASE WHEN desc_pts > 0 THEN 'OK' ELSE 'MISSING: description (<40 chars)' END AS description_status,
  CASE WHEN menu_pts > 0 THEN 'OK' ELSE 'MISSING: menu_data items' END AS menu_status,
  CASE WHEN seo_about_pts > 0 THEN 'OK' ELSE 'MISSING: seo about_section (<80 chars)' END AS seo_about_status,
  CASE WHEN seo_meta_pts > 0 THEN 'OK' ELSE 'MISSING: seo meta_description (<40 chars)' END AS seo_meta_status,

  CASE WHEN rating_pts > 0 THEN 'OK' ELSE 'MISSING: rating' END AS rating_status,
  CASE WHEN reviews_pts > 0 THEN 'OK' ELSE 'MISSING: total_reviews' END AS reviews_status,

  CASE
    WHEN city IS NULL OR btrim(city) = '' THEN 'MISSING: city (0 pts)'
    WHEN restaurants_in_city > min_city_peers THEN 'OK: well-covered city (>' || min_city_peers || ')'
    WHEN restaurants_in_city >= 2 THEN 'LOW: sparse city (2–' || min_city_peers || ', 8/15 pts)'
    ELSE 'LOW: very sparse city (1 restaurant, 0/15 pts)'
  END AS city_status,

  -- Largest single gap (for quick review)
  CASE
    WHEN GREATEST(30 - photo_pts, 25 - text_pts, 30 - rating_pts_total, 15 - city_pts) = (30 - photo_pts) THEN 'photos'
    WHEN GREATEST(30 - photo_pts, 25 - text_pts, 30 - rating_pts_total, 15 - city_pts) = (25 - text_pts) THEN 'text/content'
    WHEN GREATEST(30 - photo_pts, 25 - text_pts, 30 - rating_pts_total, 15 - city_pts) = (30 - rating_pts_total) THEN 'rating/reviews'
    ELSE 'city density'
  END AS biggest_gap_category,

  GREATEST(30 - photo_pts, 25 - text_pts, 30 - rating_pts_total, 15 - city_pts) AS biggest_gap_points

FROM picked
ORDER BY deletion_rank;
