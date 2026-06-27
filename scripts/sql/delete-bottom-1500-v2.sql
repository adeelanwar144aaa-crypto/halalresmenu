-- DESTRUCTIVE: Delete bottom 1,500 restaurants (completeness v2 + sole-city protection).
-- Paste entire script into Supabase Dashboard → SQL Editor and run once.
--
-- Scoring: photos(30) + text(25) + rating/reviews(30) + city_pts(15) = completeness_score
-- Sole-city (1 active restaurant in city): EXCLUDED from candidates
-- Sparse cities (2–5): +12 adjusted_score bonus
-- Rank by adjusted_score ASC (lowest deleted first)
--
-- Does NOT delete Supabase Storage files — remove restaurant-photos/{slug}/ separately.

BEGIN;

CREATE TEMP TABLE deletion_candidates ON COMMIT DROP AS
WITH params AS (
  SELECT
    1500 AS delete_limit,
    5 AS sparse_city_max,
    5 AS min_city_peers,
    3 AS required_photos,
    12 AS sparse_city_bonus
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

eligible AS (
  SELECT *
  FROM with_scores
  WHERE NOT is_sole_city_restaurant
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
)

SELECT
  id,
  slug,
  name,
  city,
  completeness_score,
  adjusted_score,
  city_protection_bonus,
  restaurants_in_city,
  valid_photo_url_count,
  deletion_rank
FROM ranked r
CROSS JOIN params p
WHERE r.deletion_rank <= p.delete_limit;

-- Comment out any line below if that table does not exist in your schema.
DELETE FROM menu_items
WHERE restaurant_id IN (SELECT id FROM deletion_candidates);

DELETE FROM menu_categories
WHERE restaurant_id IN (SELECT id FROM deletion_candidates);

DELETE FROM restaurant_photos
WHERE restaurant_id IN (SELECT id FROM deletion_candidates);

DELETE FROM reviews
WHERE restaurant_id IN (SELECT id FROM deletion_candidates);

DELETE FROM restaurants
WHERE id IN (SELECT id FROM deletion_candidates);

SELECT
  (SELECT COUNT(*)::int FROM deletion_candidates) AS deleted_count,
  (SELECT COUNT(*)::int FROM restaurants WHERE COALESCE(is_active, true) = true) AS active_restaurants_remaining,
  (SELECT MIN(adjusted_score) FROM deletion_candidates) AS min_deleted_adjusted_score,
  (SELECT MAX(adjusted_score) FROM deletion_candidates) AS max_deleted_adjusted_score,
  (SELECT MIN(deletion_rank) FROM deletion_candidates) AS min_deletion_rank,
  (SELECT MAX(deletion_rank) FROM deletion_candidates) AS max_deletion_rank;

COMMIT;
