export type HalalStatus = "certified" | "claimed_halal" | "unknown" | "not_certified";

/** Stored on restaurants.reviews (Google Place Details). */
export type GooglePlaceReview = {
  author_name: string | null;
  rating: number | null;
  text: string | null;
  time: number | null;
  profile_photo_url: string | null;
};

export type OpeningDayHours = {
  open?: string | null;
  close?: string | null;
  closed?: boolean;
};

export type OpeningHours = Partial<
  Record<
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday",
    OpeningDayHours
  >
>;

export type Restaurant = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  postcode?: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  halal_status: HalalStatus | string | null;
  halal_certifier: string | null;
  alcohol_on_premises: boolean | null;
  pork_free: boolean | null;
  muslim_owned: boolean | null;
  prayer_space: boolean | null;
  prayer_mat_available: boolean | null;
  wudu_facilities: boolean | null;
  family_friendly: boolean | null;
  party_space: boolean | null;
  delivery_available: boolean | null;
  /** Primary DB column for takeaway; falls back to takeaway_available */
  has_takeaway?: boolean | null;
  has_delivery?: boolean | null;
  takeaway_available: boolean | null;
  /** Google Places / synced dining flags */
  dine_in?: boolean | null;
  takeaway?: boolean | null;
  delivery?: boolean | null;
  dine_in_available: boolean | null;
  reservation_available: boolean | null;
  catering_available: boolean | null;
  opening_hours: OpeningHours | Record<string, unknown> | null;
  ramadan_hours: Record<string, unknown> | null;
  price_range: string | null;
  cuisine_type: string | null;
  language: string | null;
  cross_contamination_policy: string | null;
  halal_last_verified_at: string | null;
  logo_url?: string | null;
  /** Google Places photo URLs (jsonb string array) */
  photos?: string[] | null;
  /** Cached mosques from scripts/download-photos-and-mosques.js (jsonb) */
  nearby_mosques?: StoredNearbyMosque[] | null;
  /** Google Places reviews (jsonb array) */
  reviews?: GooglePlaceReview[] | null;
  rating?: number | null;
  total_reviews?: number | null;
  is_active?: boolean | null;
  is_temporarily_closed?: boolean | null;
  /** Optional columns — add in Supabase when available */
  hand_slaughtered?: boolean | null;
  parking_info?: string | null;
  public_transport_info?: string | null;
  /** AI or scraped menu (jsonb) */
  menu_data?: MenuData | Record<string, unknown> | null;
  /** AI-generated SEO copy (jsonb) */
  seo_content?: SeoContent | Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type SeoFaqItem = {
  question: string;
  answer: string;
};

export type SeoContent = {
  meta_title: string;
  meta_description: string;
  h1: string;
  about_section: string;
  faq: SeoFaqItem[];
};

export type MenuDataItem = {
  name: string;
  description: string | null;
  price: number | null;
};

export type MenuDataCategory = {
  name: string;
  items: MenuDataItem[];
};

export type MenuData = {
  source: string;
  categories: MenuDataCategory[];
};

export type MenuCategory = {
  id: string;
  restaurant_id: string;
  name: string;
  display_order: number | null;
};

export type MenuItem = {
  id: string;
  category_id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  is_halal: boolean | null;
  is_vegetarian: boolean | null;
  is_vegan: boolean | null;
  allergens: string | null;
  image_url: string | null;
};

export type RestaurantPhoto = {
  id: string;
  restaurant_id: string;
  url: string;
  alt_text: string | null;
  is_primary: boolean | null;
  source: string | null;
};

export type Review = {
  id: string;
  restaurant_id: string;
  source: string | null;
  author_name: string | null;
  rating: number | null;
  content: string | null;
  date: string | null;
  is_verified: boolean | null;
};

/** One mosque saved on restaurants.nearby_mosques */
export type StoredNearbyMosque = {
  name: string | null;
  address: string | null;
  lat: number;
  lng: number;
  distance: number;
};

export type NearbyMosqueRow = {
  id: string;
  restaurant_id: string;
  mosque_name: string;
  distance_km: number | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  prayer_times: Record<string, unknown> | null;
};

export type GeneratedContent = {
  id: string;
  restaurant_id: string;
  page_type: string;
  meta_title: string | null;
  meta_description: string | null;
  h1: string | null;
  body_content: string | null;
  faq_content: string | null;
  language: string | null;
  generated_at: string | null;
  last_updated: string | null;
};
