// Build check (CLAUDE.md "Definition of done"): no secrets in client bundles.
// Usage: npm run check:secrets  — builds with marked fake keys, then scans every
// file the browser can download (.next/static) for the markers and secret names.
import { execSync } from "child_process";
import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";

const MARK = "LEAKCHECK7f3a";
const env = {
  ...process.env,
  PROPERTY_RADAR_API_KEY: `pr-${MARK}`,
  ANTHROPIC_API_KEY: `sk-ant-${MARK}`,
  SUPABASE_SERVICE_ROLE_KEY: `svc-${MARK}`,
  GOOGLE_MAPS_API_KEY: `gm-${MARK}`,
};
execSync("npx next build", { stdio: "ignore", env });

const NEEDLES = [MARK, "PROPERTY_RADAR_API_KEY", "ANTHROPIC_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "GOOGLE_MAPS_API_KEY", "api.propertyradar.com"];
const files = [];
const walk = (d) => readdirSync(d).forEach((f) => { const p = path.join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); });
walk(".next/static");
const hits = [];
for (const f of files) {
  const text = readFileSync(f, "utf8");
  for (const n of NEEDLES) if (text.includes(n)) hits.push(`${f}: ${n}`);
}
if (hits.length) {
  console.error("FAIL — secrets or server-only code in client bundle:\n" + hits.join("\n"));
  process.exit(1);
}
console.log(`PASS — scanned ${files.length} client files, no secrets or server-only API code.`);
