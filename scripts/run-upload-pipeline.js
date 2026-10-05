/**
 * limit=5 smoke test (2 URL checks) then full upload with logging.
 */
const { spawnSync, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

const root = process.cwd();
const logPath = path.join(root, "upload.log");
const progressPath = path.join(root, "scripts/logs/upload-progress.json");

if (fs.existsSync(progressPath)) fs.unlinkSync(progressPath);

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(logPath, line);
  console.log(msg);
}

function runUpload(args) {
  log(`> node scripts/upload-to-r2.js ${args.join(" ")}`);
  const r = spawnSync("node", ["scripts/upload-to-r2.js", ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  fs.appendFileSync(logPath, r.stdout || "");
  fs.appendFileSync(logPath, r.stderr || "");
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r.status === 0;
}

async function fetchHead(url) {
  const res = await fetch(url, { method: "HEAD" });
  return {
    url,
    status: res.status,
    type: res.headers.get("content-type"),
  };
}

(async () => {
  fs.writeFileSync(logPath, "");
  log("Starting smoke test --limit=5");

  if (!runUpload(["--limit=5"])) {
    log("Smoke test failed");
    process.exit(1);
  }

  const summary = JSON.parse(
    fs.readFileSync(path.join(root, "scripts/logs/upload-summary.json"), "utf8")
  );

  const supabase = require("@supabase/supabase-js").createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const slugs = summary.sampleSlugs || [];
  if (slugs.length < 1) {
    log("No sample slugs from smoke test");
    process.exit(1);
  }

  const { data: rows } = await supabase
    .from("restaurants")
    .select("slug, photos")
    .in("slug", slugs.slice(0, 5));

  const urls = (rows || [])
    .map((r) => r.photos?.[0])
    .filter(Boolean)
    .slice(0, 2);

  for (const u of urls) {
    const h = await fetchHead(u);
    log(`HEAD ${h.url} -> ${h.status} ${h.type}`);
    if (h.status !== 200 || !String(h.type).includes("webp")) {
      log("Photo URL check failed");
      process.exit(1);
    }
  }

  log("Smoke test OK — starting full upload");
  if (!runUpload(["--resume"])) {
    log("Full upload failed");
    process.exit(1);
  }
  log("Full upload finished");
})();
