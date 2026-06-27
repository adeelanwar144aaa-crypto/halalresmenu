-- STEP 1 (read-only): Rank restaurants by completeness; list bottom 1,000 candidates.
-- DEPRECATED: use restaurant-completeness-bottom-1000-v2.sql (sole-city protection + sparse bonus).
-- Run in Supabase Dashboard → SQL Editor (old or new project).
-- Adjust MIN_CITY_PEERS in the params CTE if needed.

WITH params AS (
  SELECT
    5 AS min_city_peers,   -- "more than X other restaurants" → city count must be > X for full city points
    3 AS required_photos   -- scripts/download-photos-and-mosques.js uses MAX_PHOTOS = 3
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

    -- 0–30: all 3 photos in restaurants.photos (jsonb string array)
    CASE
      WHEN pc.valid_photo_url_count >= p.required_photos THEN 30
      WHEN pc.valid_photo_url_count = 2 THEN 15
      WHEN pc.valid_photo_url_count = 1 THEN 5
      ELSE 0
    END AS photo_pts,

    -- 0–25: description, menu_data, or seo_content about copy
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

    -- 0–30: rating + total_reviews (column names from add-google-places-columns.sql)
    CASE WHEN r.rating IS NOT NULL AND r.rating > 0 THEN 15 ELSE 0 END
    + CASE WHEN r.total_reviews IS NOT NULL AND r.total_reviews > 0 THEN 15 ELSE 0 END
    AS rating_pts,

    -- 0–15: prefer keeping entries in well-covered cities; sparse cities score lower
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
)

SELECT
  id,
  slug,
  name,
  city,
  rating,
  total_reviews,
  restaurants_in_city,
  valid_photo_url_count,
  photo_pts,
  text_pts,
  rating_pts,
  city_pts,
  (photo_pts + text_pts + rating_pts + city_pts) AS completeness_score
FROM scored
ORDER BY
  completeness_score ASC,
  valid_photo_url_count ASC,
  COALESCE(total_reviews, 0) ASC,
  COALESCE(rating, 0) ASC,
  restaurants_in_city ASC NULLS FIRST,
  slug ASC
LIMIT 1000;
