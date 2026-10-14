/**
 * Insert rows from scripts/backups/restaurants-deleted-*.json into restaurants_archive.
 * Requires: migration add-restaurants-archive.sql applied (SUPABASE_DB_URL or REST insert).
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

async function main() {
  const fileArg = process.argv[2];
  const backupDir = join(process.cwd(), "scripts", "backups");
  let path = fileArg;
  if (!path) {
    const files = readdirSync(backupDir)
      .filter((f) => f.startsWith("restaurants-deleted-") && f.endsWith(".json"))
      .sort();
    path = join(backupDir, files[files.length - 1] ?? "");
  }
  const rows = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>[];
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50).map((r) => ({
      ...r,
      deleted_at: r.deleted_at ?? new Date().toISOString(),
    }));
    const { error } = await supabase.from("restaurants_archive").insert(chunk);
    if (error) throw error;
    inserted += chunk.length;
  }
  console.log({ inserted, from: path });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
