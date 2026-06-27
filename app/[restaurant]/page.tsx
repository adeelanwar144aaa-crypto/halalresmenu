import type { Metadata } from "next";

export const runtime = "edge";
import { HeroSection } from "@/components/restaurant/HeroSection";
import { NearbyMosques } from "@/components/restaurant/NearbyMosques";
import {
  PhotoGallery,
  PhotoGalleryPlaceholder,
} from "@/components/restaurant/PhotoGallery";
import { PrayerTimes } from "@/components/restaurant/PrayerTimes";
import { AboutArticle } from "@/components/restaurant/overview/AboutArticle";
import { HalalArticleBlock } from "@/components/restaurant/overview/HalalArticleBlock";
import { LocationFindUs } from "@/components/restaurant/overview/LocationFindUs";
import { MenuHighlights } from "@/components/restaurant/overview/MenuHighlights";
import { NearbyHalalSEO } from "@/components/restaurant/overview/NearbyHalalSEO";
import { OpeningHoursBlock } from "@/components/restaurant/overview/OpeningHoursBlock";
import { OverviewFooter } from "@/components/restaurant/overview/OverviewFooter";
import { ReviewsArticle } from "@/components/restaurant/overview/ReviewsArticle";
import { ServiceHighlights } from "@/components/restaurant/overview/ServiceHighlights";
import { OverviewSchema } from "@/components/seo/OverviewSchema";
import { createPageMetadata } from "@/components/seo/MetaTags";
import { isRestaurantOpenNow } from "@/lib/opening-hours";
import { resolveRestaurantReviewSummary } from "@/lib/google-reviews";
import {
  firstRestaurantPhotoUrl,
  resolveRestaurantGalleryUrls,
} from "@/lib/restaurant-photos";
import { getMenuSchemaSample, parseMenuData } from "@/lib/menu-data";
import {
  fetchRestaurantBySlug,
  fetchRestaurantPhotos,
  fetchRestaurantReviews,
} from "@/lib/supabase";
import { getSiteUrl, restaurantCanonicalUrl } from "@/lib/utils";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ restaurant: string }> };

/** Keep in sync with `CACHE_TTL.RESTAURANT` in lib/cache-config.ts */
export const revalidate = 1800;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { restaurant } = await params;
  const row = await fetchRestaurantBySlug(restaurant);
  if (!row) {
    return createPageMetadata({ pageType: "overview", slug: restaurant });
  }

  const tablePhotos = await fetchRestaurantPhotos(row.id);
  const ogImage = firstRestaurantPhotoUrl(row.photos, tablePhotos);

  return createPageMetadata({
    pageType: "overview",
    slug: restaurant,
    name: row.name,
    cuisine: row.cuisine_type,
    city: row.city,
    ogImage,
  });
}

export default async function RestaurantOverviewPage({ params }: PageProps) {
  const { restaurant } = await params;
  const row = await fetchRestaurantBySlug(restaurant);
  if (!row) notFound();

  const restaurantName = row.name?.trim() || "Restaurant";

  const [photos, reviews] = await Promise.all([
    fetchRestaurantPhotos(row.id),
    fetchRestaurantReviews(row.id),
  ]);

  const menuData = parseMenuData(row.menu_data);

  const site = getSiteUrl();
  const canonical = restaurantCanonicalUrl(restaurant);
  const reviewSummary = resolveRestaurantReviewSummary(row, reviews);
  const { average, count, reviews: googleReviews } = reviewSummary;

  const open = isRestaurantOpenNow(row.opening_hours);
  const openStatus: "open" | "closed" | "unknown" =
    open === true ? "open" : open === false ? "closed" : "unknown";

  const menuSample = getMenuSchemaSample(menuData);
  const galleryUrls = resolveRestaurantGalleryUrls(row.photos, photos);

  const schemaReviews = googleReviews.map((gr, i) => ({
    id: `google-${i}`,
    restaurant_id: row.id,
    source: "google",
    author_name: gr.author_name ?? null,
    rating: gr.rating ?? null,
    content: gr.text ?? null,
    date: gr.time != null ? String(gr.time) : null,
    is_verified: null,
  }));

  return (
    <article className="bg-white">
      <OverviewSchema
        restaurant={row}
        url={canonical}
        breadcrumbs={[
          { name: "Home", url: site },
          { name: restaurantName, url: canonical },
        ]}
        reviews={schemaReviews}
        menuSample={menuSample}
      />
      <HeroSection
        restaurant={row}
        photoUrls={galleryUrls}
        slug={restaurant}
        averageRating={average ?? undefined}
        reviewCount={count ?? 0}
        openStatus={openStatus}
      />
      <AboutArticle restaurant={row} />
      {galleryUrls.length > 0 ? (
        <PhotoGallery
          photoUrls={galleryUrls}
          slug={restaurant}
          restaurantName={restaurantName}
        />
      ) : (
        <PhotoGalleryPlaceholder
          slug={restaurant}
          restaurantName={restaurantName}
        />
      )}
      <ServiceHighlights restaurant={row} />
      <MenuHighlights restaurant={row} menuData={menuData} />
      <HalalArticleBlock restaurant={row} />
      <OpeningHoursBlock restaurant={row} />
      <ReviewsArticle
        restaurantName={restaurantName}
        reviews={googleReviews}
        overallRating={average ?? null}
        totalReviewCount={count ?? 0}
      />
      <LocationFindUs restaurant={row} />
      <NearbyMosques restaurant={row} />
      <PrayerTimes restaurant={row} />
      <NearbyHalalSEO restaurant={row} />
      <OverviewFooter restaurant={row} />
    </article>
  );
}
