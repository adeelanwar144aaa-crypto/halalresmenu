import { readFileSync, writeFileSync } from "fs";

const t = readFileSync("lib/deleted-restaurant-redirects.generated.ts", "utf8");
const obj = {};
for (const line of t.split("\n")) {
  const m = line.match(/"([^"]+)":\s*"([^"]+)"/);
  if (m) obj[m[1]] = m[2];
}
writeFileSync("public/deleted-redirects.json", JSON.stringify(obj));
console.log("entries", Object.keys(obj).length);
