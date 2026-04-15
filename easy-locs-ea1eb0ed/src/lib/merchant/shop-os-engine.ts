/**
 * Shop OS Engine — Auto-generates QR codes, order pages, POS config,
 * and dynamic info per shop on activation.
 *
 * This is the core "Merchant OS" brain that makes every shop instantly operational.
 */
import { db } from "@/services/db";
import { APP_BASE_URL } from "@/lib/app-domain";
import {
  createStaticMerchantQr,
  createDynamicMerchantQr,
  encodeMerchantQr,
  toMerchantPayUrl,
} from "@/lib/merchant-qr";
import type { MerchantQrPayload } from "@/lib/merchant-qr/types";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

export interface ShopQrSet {
  order: string;       // opens order page
  payFree: string;     // open-amount payment
  payFixed: MerchantQrPayload[]; // pre-set amounts
  table: MerchantQrPayload[];   // per-table QRs
  frontDesk: string;   // reception / counter
  pickup: string;      // pickup validation
  agent: string;       // driver/agent collection
}

export interface ShopHealthScore {
  overall: number;       // 0-100
  menu: number;
  photos: number;
  payment: number;
  seo: number;
  visibility: number;
  conversion: number;
  issues: ShopIssue[];
}

export interface ShopIssue {
  key: string;
  severity: "critical" | "warning" | "info";
  message: string;
  action?: string;
  fixRoute?: string;
}

export interface ShopContext {
  id: string;
  name: string;
  slug: string;
  vertical: string;
  city: string;
  status: string;
  isPublished: boolean;
  logoUrl?: string;
  health: ShopHealthScore;
  qrSet: ShopQrSet;
  serviceMode: ServiceMode;
}

export type ServiceMode = "pickup" | "dine_in" | "delivery" | "booking" | "mixed";

/* ═══════════════════════════════════════════════════════════════
   1. AUTO QR GENERATION
   ═══════════════════════════════════════════════════════════════ */

/** Get the vertical-specific QR types to generate */
function getVerticalQrConfig(vertical: string): {
  needsTableQr: boolean;
  needsFrontDesk: boolean;
  needsPickup: boolean;
  needsAgent: boolean;
  defaultTables: string[];
  fixedAmounts: number[];
} {
  switch (vertical) {
    case "food":
    case "restaurant":
    case "cafe":
      return {
        needsTableQr: true,
        needsFrontDesk: true,
        needsPickup: true,
        needsAgent: true,
        defaultTables: ["A1", "A2", "A3", "B1", "B2", "B3", "Terrace-1", "Terrace-2"],
        fixedAmounts: [10, 25, 50, 100],
      };
    case "salon":
    case "spa":
    case "healthcare":
    case "clinic":
      return {
        needsTableQr: false,
        needsFrontDesk: true,
        needsPickup: false,
        needsAgent: false,
        defaultTables: [],
        fixedAmounts: [50, 100, 200, 500],
      };
    case "retail":
    case "grocery":
    case "electronics":
      return {
        needsTableQr: false,
        needsFrontDesk: true,
        needsPickup: true,
        needsAgent: true,
        defaultTables: [],
        fixedAmounts: [25, 50, 100, 250],
      };
    case "property":
      return {
        needsTableQr: false,
        needsFrontDesk: true,
        needsPickup: false,
        needsAgent: false,
        defaultTables: [],
        fixedAmounts: [500, 1000, 2500, 5000],
      };
    default:
      return {
        needsTableQr: false,
        needsFrontDesk: true,
        needsPickup: true,
        needsAgent: false,
        defaultTables: [],
        fixedAmounts: [10, 25, 50, 100],
      };
  }
}

/** Generate all QR codes for a shop */
export function generateShopQrSet(shop: {
  id: string;
  name: string;
  slug: string;
  vertical: string;
  walletId?: string;
  currency?: string;
}): ShopQrSet {
  const walletId = shop.walletId || shop.id;
  const currency = shop.currency || "AED";
  const config = getVerticalQrConfig(shop.vertical);
  const origin = APP_BASE_URL;

  // 1. Order page QR
  const orderUrl = `${origin}/menu/${shop.slug}`;

  // 2. Free payment QR
  const staticQr = createStaticMerchantQr({
    merchantId: shop.id,
    walletId,
    merchantName: shop.name,
    currency,
  });

  // 3. Fixed amount QRs
  const fixedQrs = config.fixedAmounts.map((amount) =>
    createDynamicMerchantQr({
      merchantId: shop.id,
      walletId,
      merchantName: shop.name,
      amount,
      currency,
      contextType: "counter",
    })
  );

  // 4. Table QRs
  const tableQrs = config.defaultTables.map((table) =>
    createStaticMerchantQr({
      merchantId: shop.id,
      walletId,
      merchantName: shop.name,
      currency,
      tableCode: table,
    })
  );

  // 5. Front desk QR (static, counter context)
  const frontDeskQr = createStaticMerchantQr({
    merchantId: shop.id,
    walletId,
    merchantName: shop.name,
    currency,
  });

  // 6. Pickup QR
  const pickupQr = createStaticMerchantQr({
    merchantId: shop.id,
    walletId,
    merchantName: shop.name,
    currency,
  });

  return {
    order: orderUrl,
    payFree: encodeMerchantQr(staticQr),
    payFixed: fixedQrs,
    table: tableQrs,
    frontDesk: encodeMerchantQr(frontDeskQr),
    pickup: encodeMerchantQr(pickupQr),
    agent: toMerchantPayUrl(staticQr, origin),
  };
}

/* ═══════════════════════════════════════════════════════════════
   2. SHOP HEALTH SCORE
   ═══════════════════════════════════════════════════════════════ */

export async function computeShopHealth(shopId: string): Promise<ShopHealthScore> {
  const [shopRes, productsRes] = await Promise.all([
    db("storefront_pages").select("*").eq("id", shopId).maybeSingle(),
    db("products").select("id, name, price, image_url, description").eq("shop_id", shopId),
  ]);

  const shop = shopRes?.data;
  const products = productsRes?.data ?? [];
  const issues: ShopIssue[] = [];

  if (!shop) {
    return { overall: 0, menu: 0, photos: 0, payment: 0, seo: 0, visibility: 0, conversion: 0, issues: [{ key: "no_shop", severity: "critical", message: "Shop not found" }] };
  }

  // Menu score
  let menuScore = 0;
  if (products.length >= 5) menuScore += 40;
  else if (products.length > 0) menuScore += 20;
  else issues.push({ key: "no_products", severity: "critical", message: "Menu is empty — add products", fixRoute: `/seller/products?shop=${shopId}` });

  const withPrice = products.filter((p: any) => p.price > 0).length;
  if (withPrice === products.length && products.length > 0) menuScore += 30;
  else if (withPrice > 0) { menuScore += 15; issues.push({ key: "missing_prices", severity: "warning", message: `${products.length - withPrice} products missing prices` }); }

  const withDesc = products.filter((p: any) => p.description?.length > 10).length;
  if (withDesc > products.length * 0.7) menuScore += 30;
  else if (withDesc > 0) { menuScore += 15; issues.push({ key: "weak_descriptions", severity: "info", message: "Add better product descriptions for SEO" }); }

  // Photos score
  let photoScore = 0;
  if (shop.logo_url) photoScore += 30; else issues.push({ key: "no_logo", severity: "warning", message: "Add a logo", fixRoute: `/dashboard/my-shop/${shopId}` });
  if (shop.banner_url) photoScore += 30; else issues.push({ key: "no_cover", severity: "warning", message: "Add a cover photo" });
  const withPhotos = products.filter((p: any) => p.image_url).length;
  if (products.length > 0) {
    const photoRatio = withPhotos / products.length;
    photoScore += Math.round(photoRatio * 40);
    if (photoRatio < 0.5) issues.push({ key: "low_product_photos", severity: "warning", message: `Only ${Math.round(photoRatio * 100)}% of products have photos` });
  }

  // Payment score
  let paymentScore = shop.contact_phone || shop.contact_email ? 50 : 0;
  if (!shop.contact_phone) issues.push({ key: "no_phone", severity: "warning", message: "Add contact phone for payments" });
  paymentScore += 50; // QR is always auto-generated

  // SEO score
  let seoScore = 0;
  if (shop.name) seoScore += 25;
  if (shop.description?.length > 20) seoScore += 25; else issues.push({ key: "weak_seo_desc", severity: "info", message: "Add a longer shop description for SEO" });
  if (shop.city) seoScore += 25;
  if (shop.slug) seoScore += 25;

  // Visibility score
  const visScore = shop.active ? 50 : 0;
  const finalVis = visScore + (shop.is_published ? 50 : 0);
  if (!shop.is_published) issues.push({ key: "not_published", severity: "critical", message: "Shop is not published", action: "Publish now" });

  // Conversion — honest: not enough data yet
  const conversionScore = -1; // -1 = "not enough data" sentinel

  const scoredModules = [menuScore, photoScore, paymentScore, seoScore, finalVis];
  const validConversion = conversionScore >= 0 ? conversionScore : null;
  if (validConversion !== null) scoredModules.push(validConversion);
  const overall = Math.round(scoredModules.reduce((a, b) => a + b, 0) / scoredModules.length);

  return {
    overall,
    menu: menuScore,
    photos: photoScore,
    payment: paymentScore,
    seo: seoScore,
    visibility: finalVis,
    conversion: conversionScore,
    issues,
  };
}

/* ═══════════════════════════════════════════════════════════════
   3. VERTICAL SERVICE MODE RESOLVER
   ═══════════════════════════════════════════════════════════════ */

export function resolveServiceMode(vertical: string): ServiceMode {
  switch (vertical) {
    case "food":
    case "restaurant":
    case "cafe":
      return "mixed"; // pickup + dine_in + delivery
    case "grocery":
    case "retail":
    case "electronics":
      return "delivery";
    case "salon":
    case "spa":
    case "healthcare":
      return "booking";
    case "property":
      return "booking";
    default:
      return "pickup";
  }
}

/* ═══════════════════════════════════════════════════════════════
   4. FULL SHOP CONTEXT LOADER
   ═══════════════════════════════════════════════════════════════ */

export async function loadShopContext(shopId: string): Promise<ShopContext | null> {
  const { data: shop } = await db
    .from("storefront_pages")
    .select("id, name, slug, vertical, city, status, is_published, logo_url, active, currency, country")
    .eq("id", shopId)
    .maybeSingle();

  if (!shop) return null;

  const health = await computeShopHealth(shopId);
  const qrSet = generateShopQrSet({
    id: shop.id,
    name: shop.name,
    slug: shop.slug,
    vertical: shop.vertical || "retail",
    currency: shop.currency || "AED",
  });

  return {
    id: shop.id,
    name: shop.name,
    slug: shop.slug,
    vertical: shop.vertical || "retail",
    city: shop.city || "",
    status: shop.status || "draft",
    isPublished: !!shop.is_published,
    logoUrl: shop.logo_url,
    health,
    qrSet,
    serviceMode: resolveServiceMode(shop.vertical || "retail"),
  };
}

/* ═══════════════════════════════════════════════════════════════
   5. FETCH ALL SHOPS FOR USER
   ═══════════════════════════════════════════════════════════════ */

export async function loadMyShops(userId: string): Promise<ShopContext[]> {
  const { data: shops } = await db
    .from("storefront_pages")
    .select("id, name, slug, vertical, city, status, is_published, logo_url, active, currency, country")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!shops?.length) return [];

  // Load health scores in parallel
  const contexts = await Promise.all(
    shops.map(async (shop: any) => {
      const health = await computeShopHealth(shop.id);
      const qrSet = generateShopQrSet({
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        vertical: shop.vertical || "retail",
        currency: shop.currency || "AED",
      });

      return {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        vertical: shop.vertical || "retail",
        city: shop.city || "",
        status: shop.status || "draft",
        isPublished: !!shop.is_published,
        logoUrl: shop.logo_url,
        health,
        qrSet,
        serviceMode: resolveServiceMode(shop.vertical || "retail"),
      } satisfies ShopContext;
    })
  );

  return contexts;
}

/* ═══════════════════════════════════════════════════════════════
   6. AI RECOMMENDATIONS PER VERTICAL
   ═══════════════════════════════════════════════════════════════ */

export function getSmartSuggestions(ctx: ShopContext): ShopIssue[] {
  const suggestions: ShopIssue[] = [...ctx.health.issues];

  // Vertical-specific suggestions
  if (ctx.vertical === "food" || ctx.vertical === "restaurant") {
    if (ctx.health.menu < 50) {
      suggestions.push({ key: "food_menu_weak", severity: "warning", message: "Add a lunch formula to boost midday orders", action: "Add menu" });
    }
    suggestions.push({ key: "food_rush", severity: "info", message: "Activate a promo between 7pm–10pm to boost evening orders" });
  }

  if (ctx.vertical === "salon" || ctx.vertical === "spa") {
    suggestions.push({ key: "salon_booking", severity: "info", message: "Enable online booking to reduce no-shows" });
  }

  if (ctx.vertical === "property") {
    suggestions.push({ key: "property_calendar", severity: "info", message: "Keep your availability calendar updated" });
  }

  if (ctx.health.photos < 40) {
    suggestions.push({ key: "photos_boost", severity: "warning", message: "Your photos reduce conversion — update them", action: "Upload photos" });
  }

  if (!ctx.isPublished) {
    suggestions.push({ key: "unpublished", severity: "critical", message: "Your shop is not visible — publish it now", action: "Publish" });
  }

  return suggestions;
}
