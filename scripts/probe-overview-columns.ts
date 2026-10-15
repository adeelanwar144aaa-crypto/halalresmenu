import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import {
  RESTAURANT_MENU_COLUMNS,
  RESTAURANT_OVERVIEW_COLUMNS,
} from "../lib/restaurant-columns";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("missing env");
  process.exit(1);
}
const supabase = createClient(url, key);
const slug = process.argv[2] || "7-spices";

async function probe(label: string, columns: string) {
  const cols = columns.split(",");
  const { data, error } = await supabase
    .from("restaurants")
    .select(columns)
    .eq("slug", slug)
    .maybeSingle();
  console.log(`${label} full:`, error?.message ?? "ok", data?.name ?? "no row");
  for (const c of cols) {
    const { error: e } = await supabase
      .from("restaurants")
      .select(c)
      .eq("slug", slug)
      .maybeSingle();
    if (e) console.log(`${label} BAD`, c, e.message);
  }
}

async function main() {
  await probe("overview", RESTAURANT_OVERVIEW_COLUMNS);
  await probe("menu", RESTAURANT_MENU_COLUMNS);
}
main();
