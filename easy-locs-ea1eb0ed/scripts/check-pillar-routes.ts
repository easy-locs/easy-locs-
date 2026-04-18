#!/usr/bin/env node
/**
 * check-pillar-routes.ts
 *
 * Enforces that every `<Route path="...">` declared in a pillar route file
 * (`src/routes/<pillar>.routes.tsx`) starts with one of that pillar's
 * declared prefixes. Legacy / shared paths that do not fit a pillar's
 * prefix must be listed in that pillar's explicit `allowlist` below.
 *
 * Relative paths (those that do not start with "/") are React Router
 * nested-route children and are always accepted — their absolute path is
 * implied by their parent <Route> in the same file.
 *
 * Run:   npx tsx scripts/check-pillar-routes.ts
 * CI:    wired as `npm run check:pillar-routes`
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface PillarConfig {
  /** Absolute path prefixes that belong to this pillar. A route path matches
   *  a prefix when it equals the prefix or starts with `${prefix}/`. */
  prefixes: string[];
  /** Explicit legacy / shared paths (exact match) allowed to live in this
   *  pillar file even though they do not match any prefix. Each entry should
   *  be reviewed; prefer migrating the route to its true pillar instead. */
  allowlist: string[];
}

const PILLAR_CONFIGS: Record<string, PillarConfig> = {
  "admin.routes.tsx": {
    prefixes: ["/admin", "/builder"],
    allowlist: [
      // Legacy developer-portal docs route hosted inside admin pillar.
      "/developer-portal/docs",
    ],
  },
  "auth.routes.tsx": {
    prefixes: ["/auth"],
    allowlist: [
      "/login",
      "/signup",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
      // Unified verification page introduced in Task #1025: handles BOTH
      // email and phone verification and is the canonical destination
      // /verify-email also redirects to. Lives at the bare /verify-account
      // path (rather than /auth/verify-account) for back-compat with
      // existing transactional emails and shared links.
      "/verify-account",
      "/onboarding",
      "/install",
    ],
  },
  "dashboard.routes.tsx": {
    prefixes: ["/dashboard"],
    allowlist: [
      "/",
      "/landing",
      "/home",
      "/pricing",
      "/real-estate/property/:propertyId",
      "/real-estate/lease/:leaseId",
      "/property-management",
      "/rentals",
      "/developer",
      "/concierge-ops",
      "/customer/:customerId",
    ],
  },
  "deeplinks.routes.tsx": {
    prefixes: [
      "/add-contact",
      "/u",
      "/product",
      "/p",
      "/live",
      "/pay",
      "/qr",
      "/sl",
      "/claim",
      "/go",
    ],
    allowlist: [],
  },
  "driver.routes.tsx": {
    prefixes: ["/driver"],
    allowlist: ["/seller", "/seller/boost", "/business", "/claim-shop/:merchantId"],
  },
  "legal.routes.tsx": {
    prefixes: [],
    allowlist: [
      "/terms",
      "/privacy",
      "/cookies",
      "/legal",
      "/about",
      "/contact",
      "/help",
      "/vision",
    ],
  },
  "me.routes.tsx": {
    prefixes: ["/me", "/settings", "/support/tickets", "/team"],
    allowlist: ["/favorites", "/notifications", "/location/live", "/permissions"],
  },
  "merchant.routes.tsx": {
    prefixes: ["/merchant"],
    allowlist: [],
  },
  "onboarding.routes.tsx": {
    prefixes: ["/onboarding"],
    allowlist: [],
  },
  "orbit.routes.tsx": {
    prefixes: ["/orbit"],
    allowlist: [],
  },
  "pro.routes.tsx": {
    prefixes: ["/pro"],
    allowlist: [],
  },
  "radar.routes.tsx": {
    // Radar is the unified discovery / marketplace pillar; it owns all
    // customer-facing browse, search, travel, mobility, property-search
    // and provider-discovery surfaces.
    prefixes: [
      "/radar",
      "/map",
      "/discover",
      "/explore",
      "/search",
      "/search-results",
      "/geo-explorer",
      "/browse",
      "/nearby",
      "/trending",
      "/top-rated",
      "/saved",
      "/activities",
      "/food",
      "/grocery",
      "/services-hub",
      "/concierge-services",
      "/shop",
      "/shops",
      "/healthcare",
      "/experiences",
      "/utility",
      "/electronics",
      "/gifts",
      "/pets",
      "/property",
      "/property-hub",
      "/properties",
      "/real-estate",
      "/real-estate-listing",
      "/rentals",
      "/travel",
      "/hotel",
      "/stay",
      "/stays",
      "/mobility",
      "/taxi",
      "/ride",
      "/rider",
      "/delivery",
      "/send",
      "/send-package",
      "/driver/heatmap",
      "/provider",
      "/listing",
      "/book",
      "/menu",
      "/store",
      "/city-market",
      "/account",
      "/guest",
      "/host",
      "/showcase",
      "/call",
      "/track",
      "/subscription",
      "/s",
    ],
    allowlist: [],
  },
  "seo.routes.tsx": {
    // SEO pillar owns public marketing / landing URLs that need to rank in
    // search engines. These are high-churn; updates should be reviewed.
    prefixes: [
      "/browse/services",
      "/marketplace",
      "/marketplace-services",
      "/marketplace/c2c",
      "/activities",
      "/activities-booking",
      "/seasonal-rentals",
      "/seasonal-rentals-booking",
      "/long-term-rentals",
      "/property-owner-software",
      "/property-management-platform",
      "/rental-management-software",
      "/guide",
      "/best",
      "/compare",
      "/services",
      "/provider/seo",
      "/locations",
      "/country",
      "/city",
      "/annonces",
    ],
    allowlist: [],
  },
  "wallet.routes.tsx": {
    prefixes: ["/wallet"],
    allowlist: [
      "/pos",
      "/pos/:shopId",
      "/checkout",
      "/checkout/address-selector",
      "/checkout/group-order",
      "/checkout/gift-order",
      "/checkout/split-bill",
      "/checkout/party-order",
      "/checkout/share-cart",
      "/orders",
      "/my-orders",
      "/my-orders/active",
      "/my-orders/archive",
      "/order/:orderId",
      "/order/receipt/:orderId",
      "/order/refund/:orderId",
      "/order/reorder/:orderId",
      "/reorder",
      "/tracking/:orderId",
      "/live-tracking",
      "/refund/:rideRequestId",
      "/payment/:orderId",
      "/payments/stripe-elements",
      "/payments/stripe-handler",
      "/guest/checkout/:cartId",
    ],
  },
};

/** Where each allowlisted path *should* eventually live. Used to produce
 *  helpful "did you mean" hints when a path surfaces in the wrong file. */
const CANONICAL_OWNERS: Array<{ prefix: string; owner: string }> = [
  { prefix: "/admin", owner: "admin.routes.tsx" },
  { prefix: "/builder", owner: "admin.routes.tsx" },
  { prefix: "/auth", owner: "auth.routes.tsx" },
  { prefix: "/dashboard", owner: "dashboard.routes.tsx" },
  { prefix: "/driver", owner: "driver.routes.tsx" },
  { prefix: "/merchant", owner: "merchant.routes.tsx" },
  { prefix: "/onboarding", owner: "onboarding.routes.tsx" },
  { prefix: "/orbit", owner: "orbit.routes.tsx" },
  { prefix: "/pro", owner: "pro.routes.tsx" },
  { prefix: "/me", owner: "me.routes.tsx" },
  { prefix: "/settings", owner: "me.routes.tsx" },
  { prefix: "/wallet", owner: "wallet.routes.tsx" },
  { prefix: "/radar", owner: "radar.routes.tsx" },
  { prefix: "/travel", owner: "radar.routes.tsx" },
  { prefix: "/food", owner: "radar.routes.tsx" },
  { prefix: "/shop", owner: "radar.routes.tsx" },
  { prefix: "/property", owner: "radar.routes.tsx" },
  { prefix: "/real-estate", owner: "radar.routes.tsx" },
  { prefix: "/mobility", owner: "radar.routes.tsx" },
];

function matchesPrefix(routePath: string, prefix: string): boolean {
  return routePath === prefix || routePath.startsWith(`${prefix}/`);
}

function suggestOwner(routePath: string): string | null {
  const match = CANONICAL_OWNERS.filter((c) => matchesPrefix(routePath, c.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return match ? match.owner : null;
}

function extractRoutePaths(source: string): string[] {
  // Matches path="..." as declared on a <Route .../> element. This is the
  // same surface the existing lint rule inspects, so we stay consistent.
  const regex = /<Route\b[^>]*\bpath\s*=\s*"([^"]*)"/g;
  const paths: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(source)) !== null) {
    paths.push(m[1]);
  }
  return paths;
}

function main(): void {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(here, "..");
  const routesDir = path.join(repoRoot, "src", "routes");

  if (!fs.existsSync(routesDir)) {
    console.error(`[pillar-routes] routes directory not found: ${routesDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(routesDir)
    .filter((f) => f.endsWith(".routes.tsx"));

  const violations: string[] = [];
  const unknownFiles: string[] = [];
  let totalChecked = 0;

  for (const file of files) {
    const config = PILLAR_CONFIGS[file];
    if (!config) {
      unknownFiles.push(file);
      continue;
    }
    const full = path.join(routesDir, file);
    const source = fs.readFileSync(full, "utf8");
    const paths = extractRoutePaths(source);
    const allowed = new Set(config.allowlist);

    for (const p of paths) {
      totalChecked++;
      // Relative (nested child) paths are inherently scoped to a parent
      // <Route> in the same file — they cannot leak to another pillar.
      if (!p.startsWith("/")) continue;

      const matched = config.prefixes.some((pref) => matchesPrefix(p, pref));
      if (matched) continue;
      if (allowed.has(p)) continue;

      const owner = suggestOwner(p);
      const hint = owner && owner !== file
        ? `→ belongs in src/routes/${owner}`
        : `→ add it to the allowlist in scripts/check-pillar-routes.ts if it is an intentional legacy/shared path`;
      violations.push(
        `  ${file}: path "${p}" does not match this pillar's prefixes ` +
          `[${config.prefixes.join(", ") || "(none)"}] ${hint}`,
      );
    }
  }

  if (unknownFiles.length > 0) {
    console.error(
      "[pillar-routes] The following route files have no pillar config. " +
        "Add an entry to PILLAR_CONFIGS in scripts/check-pillar-routes.ts:",
    );
    for (const f of unknownFiles) console.error(`  - ${f}`);
    process.exit(1);
  }

  if (violations.length > 0) {
    console.error(
      `[pillar-routes] ${violations.length} route path(s) violate pillar ownership:\n`,
    );
    for (const v of violations) console.error(v);
    console.error(
      "\nFix by (a) moving the route to the correct pillar file, or " +
        "(b) adding it to that pillar's allowlist in " +
        "scripts/check-pillar-routes.ts with a review-worthy justification.",
    );
    process.exit(1);
  }

  console.log(
    `[pillar-routes] OK — ${totalChecked} route path(s) across ` +
      `${files.length} pillar file(s) respect pillar ownership.`,
  );
}

main();
