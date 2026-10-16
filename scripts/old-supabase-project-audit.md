# Legacy Supabase project `fkmymctuuavpbonwwomj` (audit)

**Current project (env):** `zseqhtepwrqpwcrrnjbw.supabase.co`

| Location | References old project? |
|----------|-------------------------|
| `.env.local` `NEXT_PUBLIC_SUPABASE_URL` | No — `zseqhtepwrqpwcrrnjbw` |
| `wrangler.toml` / Cloudflare `[vars]` | No Supabase URL |
| App/runtime code (`app/`, `lib/`, `components/`, `worker/`) | **None** |
| `restaurants` columns (post migration 2026-10-16) | **0** rows with `supabase.co` in scanned JSON |
| `scripts/probe-storage-buckets.mjs` | Hard-coded test URL only (dev probe) |
| Lighthouse / `.lh-*.json` | Historical capture URLs (not served by app) |
| `Supabase Snippet Untitled query.csv` | Old export snapshot (not deployed) |
| `scripts/supabase-url-audit-report.json` | Point-in-time audit snapshot |

**Live dependency:** Photo URLs previously pointed at **public Storage on the old project**. Those objects were copied to **R2**; the site no longer reads `fkmymctuuavpbonwwomj` from the database.

**Old project storage:** Not manageable from the new project's Storage API (`listBuckets` → `[]`). Decommission or delete objects in the **old** Supabase dashboard if you still pay for that project.
