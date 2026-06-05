import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import {
  getResolvedSupabaseConfig,
  getSupabaseServer,
} from "../lib/supabase";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

type SeedRestaurant = {
  name: string;
  slug: string;
  city: string;
  country: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  cuisine_type: string;
  halal_status: string;
  halal_certifier: string;
  alcohol_on_premises: boolean;
  pork_free: boolean;
  muslim_owned: boolean;
  price_range: string;
};

const SEED_RESTAURANTS: SeedRestaurant[] = [
  {
    name: "The Great Chase",
    slug: "the-great-chase",
    city: "London",
    country: "UK",
    cuisine_type: "British Pakistani",
    halal_status: "certified",
    halal_certifier: "HFA",
    latitude: 51.5074,
    longitude: -0.1278,
    address: "123 High Street London",
    phone: "+44 20 1234 5678",
    alcohol_on_premises: false,
    pork_free: true,
    muslim_owned: true,
    price_range: "££",
  },
  {
    name: "Lahori Darbar",
    slug: "lahori-darbar",
    city: "Manchester",
    country: "UK",
    cuisine_type: "Pakistani",
    halal_status: "certified",
    halal_certifier: "HMC",
    latitude: 53.4808,
    longitude: -2.2426,
    address: "45 Curry Mile Manchester",
    phone: "+44 161 234 5678",
    alcohol_on_premises: false,
    pork_free: true,
    muslim_owned: true,
    price_range: "£",
  },
  {
    name: "Bismillah Grill",
    slug: "bismillah-grill",
    city: "Toronto",
    country: "Canada",
    cuisine_type: "Pakistani Indian",
    halal_status: "certified",
    halal_certifier: "ISNA Canada",
    latitude: 43.6532,
    longitude: -79.3832,
    address: "789 Danforth Ave Toronto",
    phone: "+1 416 234 5678",
    alcohol_on_premises: false,
    pork_free: true,
    muslim_owned: true,
    price_range: "££",
  },
];

function toRow(r: SeedRestaurant) {
  const now = new Date().toISOString();
  return {
    name: r.name,
    slug: r.slug,
    city: r.city,
    country: r.country,
    address: r.address,
    latitude: r.latitude,
    longitude: r.longitude,
    phone: r.phone,
    email: null,
    website: null,
    cuisine_type: r.cuisine_type,
    halal_status: r.halal_status,
    halal_certifier: r.halal_certifier,
    alcohol_on_premises: r.alcohol_on_premises,
    pork_free: r.pork_free,
    muslim_owned: r.muslim_owned,
    price_range: r.price_range,
    language: "en",
    prayer_space: true,
    prayer_mat_available: true,
    wudu_facilities: true,
    family_friendly: true,
    dine_in_available: true,
    takeaway_available: true,
    delivery_available: false,
    reservation_available: false,
    catering_available: false,
    party_space: false,
    opening_hours: null,
    ramadan_hours: null,
    updated_at: now,
    created_at: now,
  };
}

function isRlsError(message: string) {
  return /row-level security|RLS/i.test(message);
}

async function seedRestaurants(db: SupabaseClient): Promise<Error | null> {
  const rows = SEED_RESTAURANTS.map(toRow);

  for (const row of rows) {
    const { data: existing, error: selectError } = await db
      .from("restaurants")
      .select("id")
      .eq("slug", row.slug)
      .maybeSingle();

    if (selectError) {
      return new Error(`Lookup failed for ${row.slug}: ${selectError.message}`);
    }

    const payload = { ...row };
    if (existing?.id) {
      const { created_at: _preserveCreated, ...updatePayload } = payload;
      void _preserveCreated;
      const { error: updateError } = await db
        .from("restaurants")
        .update(updatePayload)
        .eq("id", (existing as { id: string }).id);
      if (updateError) {
        return new Error(`Update failed for ${row.slug}: ${updateError.message}`);
      }
      console.log(`  updated: ${row.slug}`);
    } else {
      const { error: insertError } = await db.from("restaurants").insert(payload);
      if (insertError) {
        return new Error(`Insert failed for ${row.slug}: ${insertError.message}`);
      }
      console.log(`  inserted: ${row.slug}`);
    }
  }

  const { data, error: listError } = await db
    .from("restaurants")
    .select("slug,name")
    .in(
      "slug",
      SEED_RESTAURANTS.map((r) => r.slug)
    );

  if (listError) {
    return new Error(`Could not list seeded rows: ${listError.message}`);
  }

  console.log("Seed completed. Restaurants:");
  for (const row of data ?? []) {
    console.log(
      `  - ${(row as { slug: string }).slug}: ${(row as { name: string }).name}`
    );
  }

  return null;
}

async function main() {
  const cfg = getResolvedSupabaseConfig();
  if (!cfg) {
    console.error(
      "Missing or invalid Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
    process.exit(1);
  }

  let db: SupabaseClient | null = getSupabaseServer();
  if (!db) {
    console.error("Could not create Supabase client (check URL and anon key).");
    process.exit(1);
  }

  console.log("Seeding with getSupabaseServer() from lib/supabase.ts …");
  let err = await seedRestaurants(db);

  if (err && isRlsError(err.message)) {
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (service && service.length > 20) {
      console.warn(
        "RLS blocked anon writes. Retrying once with SUPABASE_SERVICE_ROLE_KEY …"
      );
      try {
        db = createClient(cfg.url, service, {
          auth: { persistSession: false },
        });
      } catch (e) {
        console.error("Could not create service-role client:", e);
        process.exit(1);
      }
      err = await seedRestaurants(db);
    }
  }

  if (err) {
    console.error(err.message);
    if (isRlsError(err.message)) {
      console.error(
        "\nAdd an RLS policy allowing INSERT/UPDATE for the anon role, or set SUPABASE_SERVICE_ROLE_KEY in .env.local for local seeding only (never ship this key to the browser)."
      );
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
