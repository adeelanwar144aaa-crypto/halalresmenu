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
import { fetchRestaurantBySlug, getSupabaseServer } from "@/lib/supabase";
import { getSiteUrl, restaurantCanonicalUrl } from "@/lib/utils";
import type { RestaurantPhoto, Review } from "@/types/restaurant";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ restaurant: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { restaurant } = await params;
  const row = await fetchRestaurantBySlug(restaurant);
  if (!row) return { title: "Restaurant" };

  const supabase = getSupabaseServer();
  let tablePhotos: RestaurantPhoto[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("restaurant_photos")
      .select("url,is_primary")
      .eq("restaurant_id", row.id)
      .order("is_primary", { ascending: false })
      .limit(12);
    tablePhotos = (data ?? []) as RestaurantPhoto[];
  }
  const ogImage = firstRestaurantPhotoUrl(row.photos, tablePhotos);

  const description =
    row.cuisine_type && row.city
      ? `${row.name} serves ${row.cuisine_type} in ${row.city}. Halal details, menu, reviews, and prayer-aware info.`
      : `Overview, halal information, and dining details for ${row.name}.`;

  return createPageMetadata({
    title: `${row.name} — Overview`,
    description,
    canonicalPath: `/${restaurant}`,
    ogImage,
  });
}

export default async function RestaurantOverviewPage({ params }: PageProps) {
  const { restaurant } = await params;
  const row = await fetchRestaurantBySlug(restaurant);
  if (!row) notFound();

  const supabase = getSupabaseServer();
  let photos: RestaurantPhoto[] = [];
  let reviews: Review[] = [];

  if (supabase) {
    const [p, r] = await Promise.all([
      supabase
        .from("restaurant_photos")
        .select("*")
        .eq("restaurant_id", row.id)
        .order("is_primary", { ascending: false })
        .limit(12),
      supabase
        .from("reviews")
        .select("*")
        .eq("restaurant_id", row.id)
        .order("date", { ascending: false })
        .limit(12),
    ]);
    const tablePhotos = (p.data ?? []) as RestaurantPhoto[];
    photos = tablePhotos;
    reviews = (r.data ?? []) as Review[];
  }

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

  return (
    <article className="bg-white">
      <OverviewSchema
        restaurant={row}
        url={canonical}
        breadcrumbs={[
          { name: "Home", url: site },
          { name: row.name, url: canonical },
        ]}
        reviews={googleReviews.map((gr, i) => ({
          id: `google-${i}`,
          restaurant_id: row.id,
          source: "google",
          author_name: gr.author_name,
          rating: gr.rating,
          content: gr.text,
          date: gr.time ? String(gr.time) : null,
          is_verified: null,
        }))}
        menuSample={menuSample}
      />
      <HeroSection
        restaurant={row}
        photoUrls={galleryUrls}
        slug={restaurant}
        averageRating={average}
        reviewCount={count}
        openStatus={openStatus}
      />
      <AboutArticle restaurant={row} />
      {galleryUrls.length > 0 ? (
        <PhotoGallery
          photoUrls={galleryUrls}
          slug={restaurant}
          restaurantName={row.name}
        />
      ) : (
        <PhotoGalleryPlaceholder
          slug={restaurant}
          restaurantName={row.name}
        />
      )}
      <ServiceHighlights restaurant={row} />
      <MenuHighlights restaurant={row} menuData={menuData} />
      <HalalArticleBlock restaurant={row} />
      <OpeningHoursBlock restaurant={row} />
      <ReviewsArticle
        restaurantName={row.name}
        reviews={googleReviews}
        overallRating={average}
        totalReviewCount={count}
      />
      <LocationFindUs restaurant={row} />
      <NearbyMosques restaurant={row} />
      <PrayerTimes restaurant={row} />
      <NearbyHalalSEO restaurant={row} />
      <OverviewFooter restaurant={row} />
    </article>
  );
}
