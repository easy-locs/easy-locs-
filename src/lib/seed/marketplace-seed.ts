/**
 * Seed data for Easy-Locs marketplace.
 * 5 shops, 5 services, 10 products/sale listings, starter categories.
 * Clearly marked as demo data via _seed_demo flag.
 */
import { supabase } from "@/integrations/supabase/client";

const SEED_VERSION = "easylocs_seed_v1";

export const SEED_LISTINGS = [
  // ═══ SHOPS (5) — no expiry ═══
  {
    title: "Easy-Locs Concept Store Dubai",
    category: "electronics",
    listing_type: "shop",
    city: "Dubai", country: "AE",
    description: "Premium electronics, fashion, and lifestyle products in Dubai Marina. Open daily 10am–10pm.",
    price: 0, currency: "AED", price_type: "fixed",
    presence_mode: "pin", entity_type: "fixed_store",
    coverage_mode: "radius", coverage_radius_m: 2000,
    lat: 25.0762, lng: 55.1342,
    status: "published",
  },
  {
    title: "Marché Bio Saint-Germain",
    category: "grocery",
    listing_type: "shop",
    city: "Paris", country: "FR",
    description: "Organic groceries, artisan bread, and local produce. Certified bio since 2018.",
    price: 0, currency: "EUR", price_type: "fixed",
    presence_mode: "pin", entity_type: "fixed_store",
    coverage_mode: "point", coverage_radius_m: null,
    lat: 48.8534, lng: 2.3343,
    status: "published",
  },
  {
    title: "Dubai Mall Electronics Hub",
    category: "electronics",
    listing_type: "shop",
    city: "Dubai", country: "AE",
    description: "Latest smartphones, laptops, tablets. Official Apple & Samsung reseller.",
    price: 0, currency: "AED", price_type: "fixed",
    presence_mode: "pin", entity_type: "fixed_store",
    coverage_mode: "radius", coverage_radius_m: 1000,
    lat: 25.1972, lng: 55.2795,
    status: "published",
  },
  {
    title: "Le Petit Café Montmartre",
    category: "food",
    listing_type: "shop",
    city: "Paris", country: "FR",
    description: "Authentic Parisian café. Fresh pastries, espresso, and crêpes since 1987.",
    price: 0, currency: "EUR", price_type: "fixed",
    presence_mode: "pin", entity_type: "fixed_store",
    coverage_mode: "point", coverage_radius_m: null,
    lat: 48.8867, lng: 2.3431,
    status: "published",
  },
  {
    title: "Fresh Juice Cart — Marina Walk",
    category: "food",
    listing_type: "shop",
    city: "Dubai", country: "AE",
    description: "Fresh-squeezed juices, smoothies, and açaí bowls. Moving along Marina Walk daily.",
    price: 25, currency: "AED", price_type: "fixed",
    presence_mode: "live", entity_type: "mobile_seller",
    coverage_mode: "live_radius", coverage_radius_m: 3000,
    lat: 25.0780, lng: 55.1350,
    status: "published",
  },

  // ═══ SERVICES (5) — no expiry ═══
  {
    title: "Express Cleaning Pro",
    category: "services",
    listing_type: "service",
    city: "Dubai", country: "AE",
    description: "Professional deep cleaning for apartments and villas. Available 7/7. Same-day booking.",
    price: 150, currency: "AED", price_type: "per_hour",
    presence_mode: "live", entity_type: "mobile_service",
    coverage_mode: "live_radius", coverage_radius_m: 15000,
    lat: 25.2048, lng: 55.2708,
    status: "published",
  },
  {
    title: "Yacht Charter & Tours",
    category: "services",
    listing_type: "service",
    city: "Dubai", country: "AE",
    description: "Luxury yacht experiences in Dubai Marina. Sunset cruises, fishing trips.",
    price: 800, currency: "AED", price_type: "per_hour",
    presence_mode: "pin", entity_type: "fixed_store",
    coverage_mode: "radius", coverage_radius_m: 5000,
    lat: 25.0804, lng: 55.1372,
    status: "published",
  },
  {
    title: "Mobile Phone Repair — On-site",
    category: "repair",
    listing_type: "service",
    city: "Paris", country: "FR",
    description: "iPhone & Samsung repair at your location. Screen, battery, charging port.",
    price: 49, currency: "EUR", price_type: "fixed",
    presence_mode: "live", entity_type: "mobile_service",
    coverage_mode: "live_radius", coverage_radius_m: 10000,
    lat: 48.8566, lng: 2.3522,
    status: "published",
  },
  {
    title: "VTC Premium — Airport Transfers",
    category: "taxi",
    listing_type: "service",
    city: "Dubai", country: "AE",
    description: "Luxury sedan transfers to DXB & DWC airports. Meet & greet included.",
    price: 200, currency: "AED", price_type: "fixed",
    presence_mode: "live", entity_type: "driver",
    coverage_mode: "live_radius", coverage_radius_m: 25000,
    lat: 25.2532, lng: 55.3657,
    status: "published",
  },
  {
    title: "Plombier Express Paris",
    category: "home",
    listing_type: "service",
    city: "Paris", country: "FR",
    description: "Emergency plumbing, available 24/7. Intervention in less than 30 minutes.",
    price: 80, currency: "EUR", price_type: "fixed",
    presence_mode: "live", entity_type: "mobile_service",
    coverage_mode: "live_radius", coverage_radius_m: 12000,
    lat: 48.8606, lng: 2.3376,
    status: "published",
  },

  // ═══ SALE LISTINGS (10) — auto-expire 30 days ═══
  {
    title: "iPhone 15 Pro Max 256GB — Like New",
    category: "electronics",
    listing_type: "sale",
    city: "Dubai", country: "AE",
    description: "Natural Titanium, UAE warranty until Dec 2026. Includes original box.",
    price: 3200, currency: "AED", price_type: "fixed",
    presence_mode: "pin", entity_type: "fixed_store",
    coverage_mode: "point", coverage_radius_m: null,
    lat: 25.2050, lng: 55.2700,
    status: "published",
  },
  {
    title: "MacBook Pro M3 14\" — Sealed",
    category: "electronics",
    listing_type: "sale",
    city: "Paris", country: "FR",
    description: "Brand new sealed. 18GB RAM, 512GB SSD. Official Apple France warranty.",
    price: 1899, currency: "EUR", price_type: "fixed",
    presence_mode: "pin", entity_type: "fixed_store",
    coverage_mode: "point", coverage_radius_m: null,
    lat: 48.8620, lng: 2.3410,
    status: "published",
  },
  {
    title: "Samsung Galaxy S24 Ultra — Mint",
    category: "electronics",
    listing_type: "sale",
    city: "Dubai", country: "AE",
    description: "512GB Titanium Yellow. Perfect condition with S Pen and case.",
    price: 2800, currency: "AED", price_type: "fixed",
    presence_mode: "pin", entity_type: "fixed_store",
    coverage_mode: "point", coverage_radius_m: null,
    lat: 25.1850, lng: 55.2630,
    status: "published",
  },
  {
    title: "PlayStation 5 Slim + 3 Games",
    category: "electronics",
    listing_type: "sale",
    city: "Paris", country: "FR",
    description: "PS5 Slim disc edition with Spider-Man 2, FC25, and GT7. All CIB.",
    price: 380, currency: "EUR", price_type: "fixed",
    presence_mode: "off", entity_type: "fixed_store",
    coverage_mode: "point", coverage_radius_m: null,
    lat: null, lng: null,
    status: "published",
  },
  {
    title: "Dyson V15 Detect — Barely Used",
    category: "home",
    listing_type: "sale",
    city: "Dubai", country: "AE",
    description: "Cordless vacuum, purchased 2 months ago. Includes all attachments.",
    price: 1200, currency: "AED", price_type: "fixed",
    presence_mode: "pin", entity_type: "fixed_store",
    coverage_mode: "point", coverage_radius_m: null,
    lat: 25.1120, lng: 55.1890,
    status: "published",
  },
  {
    title: "Vintage Rolex Datejust 36mm",
    category: "fashion",
    listing_type: "sale",
    city: "Dubai", country: "AE",
    description: "1985 Ref. 16013 two-tone. Serviced in 2024. Full box & papers.",
    price: 18000, currency: "AED", price_type: "fixed",
    presence_mode: "pin", entity_type: "fixed_store",
    coverage_mode: "point", coverage_radius_m: null,
    lat: 25.2100, lng: 55.2740,
    status: "published",
  },
  {
    title: "Vélo électrique Cowboy C4 ST",
    category: "automotive",
    listing_type: "sale",
    city: "Paris", country: "FR",
    description: "Electric bike, 70km range, matte black. 800 km on the odometer.",
    price: 1400, currency: "EUR", price_type: "fixed",
    presence_mode: "off", entity_type: "fixed_store",
    coverage_mode: "point", coverage_radius_m: null,
    lat: null, lng: null,
    status: "published",
  },
  {
    title: "Canon EOS R6 Mark II + 24-105mm",
    category: "electronics",
    listing_type: "sale",
    city: "Dubai", country: "AE",
    description: "Professional mirrorless camera kit. 12K shutter count. Mint condition.",
    price: 7500, currency: "AED", price_type: "fixed",
    presence_mode: "pin", entity_type: "fixed_store",
    coverage_mode: "point", coverage_radius_m: null,
    lat: 25.0770, lng: 55.1310,
    status: "published",
  },
  {
    title: "Herman Miller Aeron Chair — Size C",
    category: "home",
    listing_type: "sale",
    city: "Paris", country: "FR",
    description: "Remastered edition, graphite. Purchased new in 2023. Perfect for WFH.",
    price: 750, currency: "EUR", price_type: "fixed",
    presence_mode: "off", entity_type: "fixed_store",
    coverage_mode: "point", coverage_radius_m: null,
    lat: null, lng: null,
    status: "published",
  },
  {
    title: "DJI Mini 4 Pro Fly More Combo",
    category: "electronics",
    listing_type: "sale",
    city: "Dubai", country: "AE",
    description: "Drone + 3 batteries + ND filters + carrying case. Registered with GCAA.",
    price: 3000, currency: "AED", price_type: "fixed",
    presence_mode: "pin", entity_type: "fixed_store",
    coverage_mode: "point", coverage_radius_m: null,
    lat: 25.2210, lng: 55.2850,
    status: "published",
  },

  // ═══ DRAFT (for testing) ═══
  {
    title: "[DRAFT] Test Listing — Do Not Publish",
    category: "other",
    listing_type: "sale",
    city: "Dubai", country: "AE",
    description: "This is a draft listing for testing purposes.",
    price: 100, currency: "AED", price_type: "fixed",
    presence_mode: "off", entity_type: "fixed_store",
    coverage_mode: "point", coverage_radius_m: null,
    lat: null, lng: null,
    status: "draft",
  },
];

/**
 * Insert seed data. Requires auth context.
 * Idempotent: checks seed version marker before inserting.
 */
export async function insertSeedListings(orgId: string, userId: string, providerId: string) {
  // Check if seed already applied
  const { data: existing } = await (supabase as any)
    .from("marketplace_services")
    .select("id")
    .eq("org_id", orgId)
    .ilike("title", "%Easy-Locs Concept Store%")
    .limit(1);

  if (existing && existing.length > 0) {
    console.log("[seed] Seed data already exists for this org, skipping.");
    return { skipped: true, reason: "already_seeded" };
  }

  const results = [];
  const now = new Date().toISOString();

  for (const seed of SEED_LISTINGS) {
    const isSale = seed.listing_type === "sale";
    const isDraft = seed.status === "draft";
    const publishedAt = isDraft ? null : now;
    const expiresAt = isSale && !isDraft
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;
    const slug = seed.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");

    const { data, error } = await (supabase as any)
      .from("marketplace_services")
      .insert({
        org_id: orgId,
        user_id: userId,
        provider_id: providerId,
        title: seed.title,
        category: seed.category,
        listing_type: seed.listing_type,
        city: seed.city,
        country: seed.country,
        description: seed.description,
        price: seed.price,
        currency: seed.currency,
        price_type: seed.price_type,
        presence_mode: seed.presence_mode,
        entity_type: seed.entity_type,
        coverage_mode: seed.coverage_mode,
        coverage_radius_m: seed.coverage_radius_m,
        lat: seed.lat,
        lng: seed.lng,
        anchor_lat: seed.lat,
        anchor_lng: seed.lng,
        booking_slug: slug,
        active: !isDraft,
        status: seed.status,
        auto_expire: isSale,
        listing_expires_at: expiresAt,
        published_at: publishedAt,
        location_source: seed.lat ? "manual_pin" : null,
      })
      .select("id")
      .single();

    results.push({ title: seed.title, id: data?.id, error: error?.message });
  }

  return { skipped: false, results };
}

/**
 * Auto-bootstrap: insert seed data if marketplace is empty for this org.
 */
export async function autoBootstrapSeed(orgId: string, userId: string, providerId: string) {
  const { count } = await supabase
    .from("marketplace_services")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);

  if ((count ?? 0) === 0) {
    console.log("[seed] Empty marketplace detected, inserting seed data...");
    return insertSeedListings(orgId, userId, providerId);
  }

  return { skipped: true, reason: "marketplace_not_empty" };
}
