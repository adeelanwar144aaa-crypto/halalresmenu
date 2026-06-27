-- STEP 1 v2 diagnostic: factor breakdown with city protection rules.
-- Default: ranks #1, #2, #3 from the REVISED bottom-1,000 (sole cities excluded).

WITH params AS (
  SELECT
    5 AS sparse_city_max,
    5 AS min_city_peers,
    3 AS required_photos,
    12 AS sparse_city_bonus,
    false AS use_slugs,
    ARRAY[]::text[] AS slug_filter
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
    p.sparse_city_max,
    p.sparse_city_bonus,

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

scored AS (
  SELECT
    f.*,
    (f.desc_pts + f.menu_pts + f.seo_about_pts + f.seo_meta_pts) AS text_pts,
    (f.rating_pts + f.reviews_pts) AS rating_pts_total,
    (f.photo_pts + f.desc_pts + f.menu_pts + f.seo_about_pts + f.seo_meta_pts + f.rating_pts + f.reviews_pts + f.city_pts) AS completeness_score,
    (f.photo_pts + f.desc_pts + f.menu_pts + f.seo_about_pts + f.seo_meta_pts + f.rating_pts + f.reviews_pts + f.city_pts + f.city_protection_bonus) AS adjusted_score
  FROM factors f
),

eligible AS (
  SELECT * FROM scored WHERE NOT is_sole_city_restaurant
),

ranked AS (
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
    ) AS deletion_rank
  FROM eligible e
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
  restaurants_in_city,
  completeness_score,
  city_protection_bonus,
  adjusted_score,
  valid_photo_url_count AS photo_urls,
  photo_pts,
  text_pts,
  rating_pts_total AS rating_pts,
  city_pts,
  CASE
    WHEN is_sole_city_restaurant THEN 'PROTECTED: sole restaurant in city (excluded from list)'
    WHEN restaurants_in_city BETWEEN 2 AND sparse_city_max THEN 'PROTECTED: sparse city (+' || city_protection_bonus || ' bonus)'
    WHEN restaurants_in_city > min_city_peers THEN 'Large city: no bonus'
    ELSE 'Other'
  END AS city_protection_status,
  CASE
    WHEN valid_photo_url_count >= required_photos THEN 'OK: 3 photos'
    WHEN valid_photo_url_count = 2 THEN 'MISSING: 1 of 3 photos'
    WHEN valid_photo_url_count = 1 THEN 'MISSING: 2 of 3 photos'
    ELSE 'MISSING: all photos'
  END AS photo_status,
  CASE WHEN desc_pts > 0 THEN 'OK' ELSE 'MISSING: description' END AS description_status,
  CASE WHEN menu_pts > 0 THEN 'OK' ELSE 'MISSING: menu_data' END AS menu_status,
  CASE WHEN rating_pts > 0 THEN 'OK' ELSE 'MISSING: rating' END AS rating_status,
  CASE WHEN reviews_pts > 0 THEN 'OK' ELSE 'MISSING: total_reviews' END AS reviews_status
FROM picked
ORDER BY deletion_rank;
