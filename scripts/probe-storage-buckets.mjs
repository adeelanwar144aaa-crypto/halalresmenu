import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const base = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(base, key);

for (const prefix of ["", "restaurant-photos"]) {
  const { data, error } = await supabase.storage
    .from("restaurant-photos")
    .list(prefix, { limit: 5 });
  console.log("list", { prefix, error: error?.message, count: data?.length, sample: data?.slice(0, 2)?.map((x) => x.name) });
}

const testUrl =
  "https://fkmymctuuavpbonwwomj.supabase.co/storage/v1/object/public/restaurant-photos/restaurant-photos/diyarbakir-sofrasi/photo-1.jpg";
const h = await fetch(testUrl, { method: "HEAD" });
console.log("HEAD live object", { status: h.status, contentLength: h.headers.get("content-length") });

const rb = await fetch(`${base}/storage/v1/bucket`, {
  headers: { Authorization: `Bearer ${key}`, apikey: key },
});
console.log("GET /storage/v1/bucket", rb.status, await rb.text());
