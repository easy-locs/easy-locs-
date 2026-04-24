#!/usr/bin/env node
/**
 * generate-route-inventory.cjs
 *
 * Discovers every route/page from the app's route files (src/routes/*.tsx)
 * and emits:
 *   docs/runtime/ROUTE_INVENTORY.md
 *   docs/runtime/ROUTE_INVENTORY.json
 *
 * Outputs per-route:
 *   path, domain, authLevel (public/protected/admin/merchant/driver/pro),
 *   component, redirect target (if Navigate), lazy-chunk hint, notes.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ROUTES_DIR = path.join(ROOT, "src", "routes");
const OUT_DIR = path.join(ROOT, "docs", "runtime");

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── helpers ──────────────────────────────────────────────────────────────────

function readFile(f) {
  try { return fs.readFileSync(f, "utf8"); } catch { return ""; }
}

/**
 * Rough TSX parser — extracts every <Route path="…"> element from a file.
 * Returns array of { path, isProtected, isAdmin, isMerchant, isDriver, isPro,
 *                    isRedirect, redirectTo, component, file }.
 */
function parseRoutes(fileContent, filename) {
  const results = [];

  // Match every <Route … /> or <Route …> block (single-line style)
  // Pattern: path="…" possibly with element=<...> and wrapping components
  const routeRe = /<Route\s[^>]*?path="([^"]+)"[^>]*/g;
  let m;
  while ((m = routeRe.exec(fileContent)) !== null) {
    const routePath = m[1];
    const block = m[0];

    // Determine auth classification
    const isProtected = block.includes("ProtectedRoute") ||
      fileContent.slice(m.index - 200, m.index + 600).includes("ProtectedRoute");
    const isAdmin = block.includes("SuperAdminGate") ||
      fileContent.slice(m.index, m.index + 600).includes("SuperAdminGate");
    const isMerchant = routePath.startsWith("/merchant");
    const isDriver = routePath.startsWith("/driver");
    const isPro = routePath.startsWith("/pro");

    // Redirect detection
    const isRedirect = block.includes("Navigate to=") ||
      fileContent.slice(m.index, m.index + 300).includes("<Navigate to=");
    let redirectTo = null;
    if (isRedirect) {
      const redir = fileContent.slice(m.index, m.index + 300).match(/<Navigate to="([^"]+)"/);
      if (redir) redirectTo = redir[1];
    }

    // Component detection
    let component = "unknown";
    const compMatch = block.match(/<(?:\w+\.)?(\w+Page|\w+Hub|\w+Dashboard|\w+Center|\w+View|\w+Screen|\w+Router)\s/);
    if (compMatch) component = compMatch[1];

    // Auth level
    let authLevel = "public";
    if (isAdmin) authLevel = "admin";
    else if (isPro) authLevel = "pro";
    else if (isMerchant) authLevel = "merchant";
    else if (isDriver) authLevel = "driver";
    else if (isProtected) authLevel = "protected";

    // Domain from filename
    const basename = path.basename(filename, ".routes.tsx");

    results.push({
      path: routePath,
      domain: basename,
      authLevel,
      component,
      isRedirect,
      redirectTo,
      file: `src/routes/${path.basename(filename)}`,
    });
  }

  return results;
}

// ─── main ─────────────────────────────────────────────────────────────────────

const routeFiles = fs.readdirSync(ROUTES_DIR)
  .filter(f => f.endsWith(".routes.tsx"))
  .map(f => path.join(ROUTES_DIR, f));

// Also scan deeplinks routes
const allRouteFiles = routeFiles;

const allRoutes = [];
for (const f of allRouteFiles) {
  const content = readFile(f);
  const parsed = parseRoutes(content, f);
  allRoutes.push(...parsed);
}

// Deduplicate by path (keep first occurrence)
const seen = new Set();
const routes = allRoutes.filter(r => {
  if (seen.has(r.path)) return false;
  seen.add(r.path);
  return true;
}).sort((a, b) => a.path.localeCompare(b.path));

// Also add root route manually if not captured
if (!routes.find(r => r.path === "/")) {
  routes.unshift({
    path: "/",
    domain: "dashboard",
    authLevel: "public",
    component: "HomeRouter",
    isRedirect: false,
    redirectTo: null,
    file: "src/routes/dashboard.routes.tsx",
  });
}

console.log(`[route-inventory] Discovered ${routes.length} routes across ${allRouteFiles.length} files.`);

// ─── output JSON ──────────────────────────────────────────────────────────────

const jsonOut = {
  generated: new Date().toISOString(),
  totalRoutes: routes.length,
  routes: routes.map(r => ({
    path: r.path,
    domain: r.domain,
    authLevel: r.authLevel,
    component: r.component,
    isRedirect: r.isRedirect,
    redirectTo: r.redirectTo || null,
    sourceFile: r.file,
    criticalUIMarkers: getCriticalMarkers(r),
    expectedBehavior: getExpectedBehavior(r),
  })),
};

fs.writeFileSync(
  path.join(OUT_DIR, "ROUTE_INVENTORY.json"),
  JSON.stringify(jsonOut, null, 2),
  "utf8"
);

// ─── output Markdown ──────────────────────────────────────────────────────────

const authBadge = {
  public: "🟢 public",
  protected: "🔵 protected",
  admin: "🔴 admin",
  merchant: "🟠 merchant",
  driver: "🟡 driver",
  pro: "🟣 pro",
};

const groupedByDomain = {};
for (const r of routes) {
  if (!groupedByDomain[r.domain]) groupedByDomain[r.domain] = [];
  groupedByDomain[r.domain].push(r);
}

let md = `# Route Inventory\n\n`;
md += `> Generated: ${new Date().toISOString()}\n`;
md += `> Total routes: **${routes.length}**\n\n`;
md += `## Summary\n\n`;
md += `| Auth Level | Count |\n|---|---|\n`;
const counts = {};
for (const r of routes) counts[r.authLevel] = (counts[r.authLevel] || 0) + 1;
for (const [k, v] of Object.entries(counts)) md += `| ${authBadge[k] || k} | ${v} |\n`;
md += `\n---\n\n`;

for (const [domain, domainRoutes] of Object.entries(groupedByDomain)) {
  md += `## ${domain.charAt(0).toUpperCase() + domain.slice(1)} Routes\n\n`;
  md += `| Path | Auth Level | Component | Redirect | Notes |\n|---|---|---|---|---|\n`;
  for (const r of domainRoutes) {
    const badge = authBadge[r.authLevel] || r.authLevel;
    const redir = r.isRedirect ? `→ ${r.redirectTo || "?"}` : "-";
    const notes = getExpectedBehavior(r);
    md += `| \`${r.path}\` | ${badge} | ${r.component} | ${redir} | ${notes} |\n`;
  }
  md += `\n`;
}

md += `## Atomic Acceptance Criteria\n\n`;
md += `For every route in this inventory:\n\n`;
md += `- [ ] Direct navigation loads without black screen\n`;
md += `- [ ] Hard refresh returns 200 (not CF 404)\n`;
md += `- [ ] body.scrollHeight > 0\n`;
md += `- [ ] Splash disappears within 8 seconds\n`;
md += `- [ ] \`window.__EASYLOCS_REACT_MOUNTED__ === true\` (when applicable)\n`;
md += `- [ ] No uncaught JS exception in console\n`;
md += `- [ ] No failed JS/CSS asset requests\n`;
md += `- [ ] No CSP violation\n`;
md += `- [ ] Protected routes redirect to /login when unauthenticated\n`;
md += `- [ ] Admin routes redirect or show 403 for non-admins\n`;
md += `- [ ] No infinite spinner\n`;
md += `- [ ] No unrendered error boundary\n`;

fs.writeFileSync(path.join(OUT_DIR, "ROUTE_INVENTORY.md"), md, "utf8");

console.log(`[route-inventory] Written to docs/runtime/ROUTE_INVENTORY.md`);
console.log(`[route-inventory] Written to docs/runtime/ROUTE_INVENTORY.json`);

// ─── helpers ──────────────────────────────────────────────────────────────────

function getCriticalMarkers(r) {
  if (r.isRedirect) return ["redirect"];
  const markers = ["body.scrollHeight > 0", "no-black-screen"];
  if (r.authLevel !== "public") markers.push("auth-redirect-when-unauthed");
  if (r.authLevel === "admin") markers.push("admin-gate-check");
  markers.push("splash-gone");
  return markers;
}

function getExpectedBehavior(r) {
  if (r.isRedirect) return `Redirects to ${r.redirectTo || "?"}`;
  if (r.authLevel === "public") return "Renders without auth";
  if (r.authLevel === "admin") return "Requires admin role; redirects or 403 otherwise";
  if (r.authLevel === "merchant") return "Requires merchant session";
  if (r.authLevel === "driver") return "Requires driver session";
  if (r.authLevel === "pro") return "Requires pro session";
  return "Requires authenticated session; redirects to /login otherwise";
}
