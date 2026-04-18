import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

import { cFromEdge, cRpcEdge } from "../_shared/execution/content-mutation.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const BRAND_NAME = "EASY-LOCS®";
const APP_URL = (Deno.env.get("APP_URL") || "https://www.easy-locs.com").replace(/\/+$/, "");
const DEFAULT_OG_IMAGE = `${APP_URL}/og/og-default.jpg`;
const BOT_UA_PATTERN = /(facebookexternalhit|facebot|meta-externalagent|whatsapp|telegrambot|twitterbot|linkedinbot|slackbot|discordbot|skypeuripreview|pinterest|vkshare|googlebot|bingbot|applebot|crawler|spider|bot)/i;

function shouldServePreviewHtml(req: Request): boolean {
  const ua = req.headers.get("user-agent") || "";
  if (!ua) return true;
  if (BOT_UA_PATTERN.test(ua)) return true;
  return !ua.includes("Mozilla");
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function toVersionToken(value?: string | null): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return String(parsed);
  const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, "");
  return cleaned || null;
}

function buildOptimizedOgImageUrl(image: string): string {
  // Use raw public URL directly — no image transform (requires paid plan)
  // Just ensure the URL is absolute and accessible
  try {
    new URL(image);
    return image;
  } catch {
    return image;
  }
}

function withCacheBust(image: string | null | undefined, version?: string | null): string {
  const source = image || DEFAULT_OG_IMAGE;
  const base = buildOptimizedOgImageUrl(source);
  const token = toVersionToken(version);
  if (!token) return base;
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}v=${encodeURIComponent(token)}`;
}

function escapeAttr(val: string): string {
  return val
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.href;
  } catch {
    if (url.startsWith("/")) return url;
    return "";
  }
}

function htmlPage(meta: {
  title: string;
  description: string;
  image: string;
  url: string;
  redirectUrl: string;
  type?: string;
  jsonLd?: Record<string, unknown>;
}): string {
  const safeTitle = escapeAttr(meta.title);
  const safeDesc = escapeAttr(meta.description);
  const safeImage = escapeAttr(sanitizeUrl(meta.image || DEFAULT_OG_IMAGE));
  const safeUrl = escapeAttr(sanitizeUrl(meta.url));
  const safeRedirectUrl = escapeAttr(sanitizeUrl(meta.redirectUrl));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}"/>

  <!-- Open Graph -->
  <meta property="og:type" content="${meta.type || "website"}"/>
  <meta property="og:title" content="${safeTitle}"/>
  <meta property="og:description" content="${safeDesc}"/>
  <meta property="og:image" content="${safeImage}"/>
  <meta property="og:image:secure_url" content="${safeImage}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:url" content="${safeUrl}"/>
  <meta property="og:site_name" content="${BRAND_NAME}"/>

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${safeTitle}"/>
  <meta name="twitter:description" content="${safeDesc}"/>
  <meta name="twitter:image" content="${safeImage}"/>

  <!-- Canonical -->
  <link rel="canonical" href="${safeUrl}"/>

  ${meta.jsonLd ? `<script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>` : ""}

  <!-- Redirect fallback -->
  <meta http-equiv="refresh" content="0;url=${safeRedirectUrl}"/>
  <script>window.location.replace(${JSON.stringify(safeRedirectUrl)});</script>
</head>
<body>
  <p>Redirecting to <a href="${safeRedirectUrl}">${safeTitle}</a>...</p>
</body>
</html>`;
}

function buildHeaders(): Headers {
  const h = new Headers();
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent");
  h.set("Content-Type", "text/html; charset=utf-8");
  h.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  h.set("Pragma", "no-cache");
  h.set("Expires", "0");
  return h;
}

function buildSocialResponse(req: Request, html: string, redirectUrl: string): Response {
  if (shouldServePreviewHtml(req)) {
    // Use Blob to force text/html Content-Type (Supabase Edge Runtime overrides string responses to text/plain)
    const blob = new Blob([html], { type: "text/html; charset=utf-8" });
    return new Response(blob, { status: 200, headers: buildHeaders() });
  }

  const redirectHeaders = new Headers();
  redirectHeaders.set("Access-Control-Allow-Origin", "*");
  redirectHeaders.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent");
  redirectHeaders.set("Location", redirectUrl);
  redirectHeaders.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  redirectHeaders.set("Pragma", "no-cache");
  redirectHeaders.set("Expires", "0");

  return new Response(null, { status: 302, headers: redirectHeaders });
}


async function handleListing(req: Request, slug: string, shareUrl: string, shareVersion?: string | null): Promise<Response> {
  const { data: listing } = await supabase
    .from("public_listings")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!listing) {
    return new Response("Not found", { status: 404, headers: { ...corsHeaders } });
  }

  const { data: property } = await cRpcEdge(supabase, "get_listing_property", { p_listing_id: listing.id });

  const title = `${listing.title || property?.label || "Vacation Rental"} — ${property?.city || listing.city || ""} | Easy-Locs`.slice(0, 60);
  const desc = `${listing.title || property?.label || "Rental"} in ${property?.city || ""}${property?.country ? `, ${property.country}` : ""}. ${listing.max_guests ? `Up to ${listing.max_guests} guests.` : ""} Book directly on Easy-Locs.`.slice(0, 160);

  const photos: string[] = property?.photo_urls || [];
  const rawImage = listing.cover_url || photos[0] || DEFAULT_OG_IMAGE;
  const image = withCacheBust(rawImage, shareVersion || listing.updated_at || null);
  const redirectUrl = `${APP_URL}/listing/${slug}`;

  return buildSocialResponse(
    req,
    htmlPage({
      title,
      description: desc,
      image,
      url: shareUrl,
      redirectUrl,
      type: "website",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "LodgingBusiness",
        name: listing.title || property?.label,
        description: listing.description?.slice(0, 300) || desc,
        url: redirectUrl,
        image,
        address: {
          "@type": "PostalAddress",
          addressLocality: property?.city,
          addressCountry: property?.country,
        },
        ...(listing.price_per_night > 0
          ? {
              priceRange: `€${listing.price_per_night}/night`,
              offers: { "@type": "Offer", price: listing.price_per_night, priceCurrency: listing.currency || "EUR" },
            }
          : {}),
      },
    }),
    redirectUrl
  );
}

async function handleService(req: Request, slug: string, shareUrl: string, shareVersion?: string | null): Promise<Response> {
  let service: Record<string, unknown> | null = null;
  const { data: conciergeService } = await supabase
    .from("concierge_services")
    .select("*")
    .eq("booking_slug", slug)
    .eq("active", true)
    .maybeSingle();
  service = conciergeService;

  // Fallback to marketplace_services
  if (!service) {
    const { data: mpService } = await supabase
      .from("listings")
      .select("*")
      .eq("booking_slug", slug)
      .eq("active", true)
      .maybeSingle();
    service = mpService;
  }

  if (!service) {
    return new Response("Not found", { status: 404, headers: { ...corsHeaders } });
  }

  const photos: string[] = Array.isArray(service.photo_urls) ? (service.photo_urls as string[]).filter(Boolean) : [];
  const rawImage = String(service.photo_url || "") || photos[0] || DEFAULT_OG_IMAGE;
  const image = withCacheBust(rawImage, shareVersion || String(service.updated_at || "") || null);
  const sTitle = String(service.title || "Service");
  const sCity = String(service.city || "");
  const sPrice = Number(service.price) || 0;
  const sCurrency = String(service.currency || "EUR");
  const title = `${sTitle} — ${sCity} | Easy-Locs`.slice(0, 60);
  const desc = `${sTitle}${sCity ? ` in ${sCity}` : ""}. ${sPrice > 0 ? `From ${sPrice} ${sCurrency}.` : ""} Book on Easy-Locs.`.slice(0, 160);
  const redirectUrl = `${APP_URL}/book/${slug}`;

  return buildSocialResponse(req, htmlPage({ title, description: desc, image, url: shareUrl, redirectUrl, type: "website" }), redirectUrl);
}

async function handleHost(req: Request, slug: string, shareUrl: string, shareVersion?: string | null): Promise<Response> {
  const { data: host } = await supabase
    .from("landlord_profiles")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!host) {
    return new Response("Not found", { status: 404, headers: { ...corsHeaders } });
  }

  const image = withCacheBust(host.avatar_url || DEFAULT_OG_IMAGE, shareVersion || host.updated_at || null);
  const title = `${host.display_name} — Properties on Easy-Locs`.slice(0, 60);
  const desc = `Browse vacation rentals by ${host.display_name}${host.city ? ` in ${host.city}` : ""}. Book directly on Easy-Locs.`.slice(0, 160);
  const redirectUrl = `${APP_URL}/host/${slug}`;

  return buildSocialResponse(req, htmlPage({ title, description: desc, image, url: shareUrl, redirectUrl, type: "profile" }), redirectUrl);
}

async function handleProvider(req: Request, slug: string, shareUrl: string, shareVersion?: string | null): Promise<Response> {
  const { data: provider } = await supabase
    .from("marketplace_providers")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!provider) {
    return new Response("Not found", { status: 404, headers: { ...corsHeaders } });
  }

  const { data: firstService } = await supabase
    .from("listings")
    .select("photo_urls, updated_at")
    .eq("provider_id", provider.id)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const firstServicePhoto = Array.isArray(firstService?.photo_urls) ? String(firstService.photo_urls[0] || "") : "";
  const rawImage = provider.cover_photo_url || provider.avatar_url || firstServicePhoto || OG_MARKETPLACE_IMAGE;
  const image = withCacheBust(rawImage, shareVersion || provider.updated_at || firstService?.updated_at || null);
  const title = `${provider.display_name} — Services | Easy-Locs`.slice(0, 60);
  const desc = `${provider.bio?.slice(0, 120) || `Discover services by ${provider.display_name}`}`.slice(0, 160);
  const redirectUrl = `${APP_URL}/provider/${slug}`;

  return buildSocialResponse(req, htmlPage({ title, description: desc, image, url: shareUrl, redirectUrl, type: "profile" }), redirectUrl);
}

async function handleRealEstate(req: Request, slug: string, shareUrl: string, shareVersion?: string | null): Promise<Response> {
  const { data: listing } = await supabase
    .from("real_estate_listings")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (!listing) {
    return new Response("Not found", { status: 404, headers: { ...corsHeaders } });
  }

  const photos: string[] = Array.isArray(listing.photo_urls) ? (listing.photo_urls as string[]) : [];
  const rawImage = photos[0] || DEFAULT_OG_IMAGE;
  const image = withCacheBust(rawImage, shareVersion || listing.updated_at || null);

  const priceLabel = listing.listing_type === "long_term_rent" ? "/month" : "";
  const title = `${listing.title || listing.property_type || "Property"} — ${listing.city || ""}${listing.country ? `, ${listing.country}` : ""} | Easy-Locs`.slice(0, 60);
  const desc = `${listing.title || listing.property_type || "Property"} in ${listing.city || ""}. ${listing.surface_sqm ? listing.surface_sqm + " m²" : ""}${listing.bedrooms ? ", " + listing.bedrooms + " bed" : ""}. ${listing.price > 0 ? listing.price.toLocaleString() + " " + (listing.currency || "EUR") + priceLabel : ""} — Easy-Locs`.slice(0, 160);
  const redirectUrl = `${APP_URL}/properties/${slug}`;

  return buildSocialResponse(
    req,
    htmlPage({
      title,
      description: desc,
      image,
      url: shareUrl,
      redirectUrl,
      type: "website",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        name: listing.title,
        description: listing.description?.slice(0, 300) || desc,
        url: redirectUrl,
        image,
        address: {
          "@type": "PostalAddress",
          addressLocality: listing.city,
          addressCountry: listing.country,
          streetAddress: listing.address || undefined,
        },
        ...(listing.price > 0
          ? {
              offers: { "@type": "Offer", price: listing.price, priceCurrency: listing.currency || "EUR" },
            }
          : {}),
      },
    }),
    redirectUrl
  );
}


const OG_PAYMENT_IMAGE = `${APP_URL}/og/og-payment.jpg`;
const OG_PROFILE_IMAGE = `${APP_URL}/og/og-profile.jpg`;
const OG_SHOP_IMAGE = `${APP_URL}/og/og-shop.jpg`;
const OG_SERVICE_IMAGE = `${APP_URL}/og/og-service.jpg`;
const OG_CONTACT_IMAGE = `${APP_URL}/og/og-contact.jpg`;
const OG_ORDER_IMAGE = `${APP_URL}/og/og-order.jpg`;
const OG_FOREX_IMAGE = `${APP_URL}/og/og-forex.jpg`;
const OG_ISLAMIC_IMAGE = `${APP_URL}/og/og-islamic.jpg`;
const OG_FOOD_IMAGE = `${APP_URL}/og/og-food.jpg`;
const OG_PROPERTY_IMAGE = `${APP_URL}/og/og-property.jpg`;
const OG_MARKETPLACE_IMAGE = `${APP_URL}/og/og-marketplace.jpg`;
const OG_RADAR_IMAGE = `${APP_URL}/og/og-radar.jpg`;

async function handlePayment(req: Request, slug: string, shareUrl: string, shareVersion?: string | null): Promise<Response> {
  const { data: link } = await supabase
    .from("payment_links")
    .select("*")
    .eq("id", slug)
    .maybeSingle();

  if (!link) {
    const { data: request } = await supabase
      .from("payment_requests")
      .select("*")
      .eq("id", slug)
      .maybeSingle();

    if (request) {
      const { data: requester } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", request.requester_id)
        .maybeSingle();

      const name = requester?.display_name || "Someone";
      const title = `${name} requests ${request.amount} ${request.currency || "EUR"} — Easy-Locs`.slice(0, 60);
      const desc = `Open to pay this request on Easy-Locs`.slice(0, 160);
      const image = withCacheBust(OG_PAYMENT_IMAGE, shareVersion);
      const redirectUrl = `${APP_URL}/pay/request/${slug}`;

      return buildSocialResponse(req, htmlPage({ title, description: desc, image, url: shareUrl, redirectUrl }), redirectUrl);
    }

    return buildSocialResponse(req, htmlPage({
      title: "Payment — Easy-Locs",
      description: "Send or receive money on Easy-Locs",
      image: OG_PAYMENT_IMAGE,
      url: shareUrl,
      redirectUrl: `${APP_URL}/wallet`,
    }), `${APP_URL}/wallet`);
  }

  const { data: creator } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", link.creator_id)
    .maybeSingle();

  const senderName = creator?.display_name || "Someone";
  let title: string;
  let desc: string;

  if (link.type === "request") {
    title = `${senderName} requests ${link.amount} ${link.currency || "EUR"} — Easy-Locs`.slice(0, 60);
    desc = `Open to pay this request${link.note ? `: ${link.note}` : ""}`.slice(0, 160);
  } else if (link.type === "invite") {
    title = `${senderName} sends you ${link.amount} ${link.currency || "EUR"} — Easy-Locs`.slice(0, 60);
    desc = `Open to receive this payment on Easy-Locs`.slice(0, 160);
  } else {
    title = `Pay ${senderName} ${link.amount} ${link.currency || "EUR"} — Easy-Locs`.slice(0, 60);
    desc = `Open to complete this payment on Easy-Locs`.slice(0, 160);
  }

  const image = withCacheBust(creator?.avatar_url || OG_PAYMENT_IMAGE, shareVersion || link.updated_at);
  const redirectUrl = `${APP_URL}/pay/link/${slug}`;

  return buildSocialResponse(req, htmlPage({ title, description: desc, image, url: shareUrl, redirectUrl }), redirectUrl);
}

async function handleProfile(req: Request, slug: string, shareUrl: string, shareVersion?: string | null): Promise<Response> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, bio, updated_at")
    .eq("id", slug)
    .maybeSingle();

  if (!profile) {
    return buildSocialResponse(req, htmlPage({
      title: "Profile — Easy-Locs",
      description: "View profile on Easy-Locs",
      image: OG_PROFILE_IMAGE,
      url: shareUrl,
      redirectUrl: `${APP_URL}/u/${slug}`,
      type: "profile",
    }), `${APP_URL}/u/${slug}`);
  }

  const title = `${profile.display_name || "User"} — Easy-Locs`.slice(0, 60);
  const desc = (profile.bio || `View ${profile.display_name}'s profile on Easy-Locs`).slice(0, 160);
  const image = withCacheBust(profile.avatar_url || OG_PROFILE_IMAGE, shareVersion || profile.updated_at);
  const redirectUrl = `${APP_URL}/u/${slug}`;

  return buildSocialResponse(req, htmlPage({ title, description: desc, image, url: shareUrl, redirectUrl, type: "profile" }), redirectUrl);
}

async function handleContact(req: Request, slug: string, shareUrl: string, shareVersion?: string | null): Promise<Response> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, updated_at")
    .eq("id", slug)
    .maybeSingle();

  const name = profile?.display_name || "Someone";
  const title = `Add ${name} as contact — Easy-Locs`.slice(0, 60);
  const desc = `Open to add ${name} to your Easy-Locs contacts`.slice(0, 160);
  const image = withCacheBust(profile?.avatar_url || OG_CONTACT_IMAGE, shareVersion || profile?.updated_at);
  const redirectUrl = `${APP_URL}/add-contact?userId=${slug}`;

  return buildSocialResponse(req, htmlPage({ title, description: desc, image, url: shareUrl, redirectUrl }), redirectUrl);
}

async function handleShop(req: Request, slug: string, shareUrl: string, shareVersion?: string | null): Promise<Response> {
  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!shop) {
    return buildSocialResponse(req, htmlPage({
      title: "Shop — Easy-Locs",
      description: "Discover shops on Easy-Locs",
      image: OG_SHOP_IMAGE,
      url: shareUrl,
      redirectUrl: `${APP_URL}/s/${slug}`,
    }), `${APP_URL}/s/${slug}`);
  }

  const title = `${shop.name || shop.title || "Shop"} — Easy-Locs`.slice(0, 60);
  const desc = (shop.description || `Discover ${shop.name || "this shop"} on Easy-Locs`).slice(0, 160);
  const photos: string[] = Array.isArray(shop.photo_urls) ? shop.photo_urls : [];
  const rawImage = shop.cover_url || shop.logo_url || photos[0] || OG_SHOP_IMAGE;
  const image = withCacheBust(rawImage, shareVersion || shop.updated_at);
  const redirectUrl = `${APP_URL}/s/${slug}`;

  return buildSocialResponse(req, htmlPage({ title, description: desc, image, url: shareUrl, redirectUrl }), redirectUrl);
}

async function handleProduct(req: Request, slug: string, shareUrl: string, shareVersion?: string | null): Promise<Response> {
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", slug)
    .maybeSingle();

  if (!product) {
    return buildSocialResponse(req, htmlPage({
      title: "Product — Easy-Locs",
      description: "Discover products on Easy-Locs",
      image: OG_SHOP_IMAGE,
      url: shareUrl,
      redirectUrl: `${APP_URL}/p/${slug}`,
    }), `${APP_URL}/p/${slug}`);
  }

  const title = `${product.name || product.title || "Product"} — Easy-Locs`.slice(0, 60);
  const desc = (product.description || `View ${product.name || "this product"} on Easy-Locs`).slice(0, 160);
  const photos: string[] = Array.isArray(product.photo_urls) ? product.photo_urls : [];
  const rawImage = product.image_url || photos[0] || OG_SHOP_IMAGE;
  const image = withCacheBust(rawImage, shareVersion || product.updated_at);
  const redirectUrl = `${APP_URL}/p/${slug}`;

  return buildSocialResponse(req, htmlPage({ title, description: desc, image, url: shareUrl, redirectUrl }), redirectUrl);
}

async function handleOrder(req: Request, slug: string, shareUrl: string, shareVersion?: string | null): Promise<Response> {
  const title = "Order — Easy-Locs";
  const desc = "View your order on Easy-Locs";
  const image = OG_ORDER_IMAGE;
  const redirectUrl = `${APP_URL}/my-orders?id=${slug}`;

  return buildSocialResponse(req, htmlPage({ title, description: desc, image, url: shareUrl, redirectUrl }), redirectUrl);
}

async function handleShortLink(req: Request, code: string, shareUrl: string, shareVersion?: string | null): Promise<Response> {
  const { data } = await supabase
    .from("short_links")
    .select("action, payload")
    .eq("code", code)
    .maybeSingle();

  if (!data) {
    return buildSocialResponse(req, htmlPage({
      title: "Easy-Locs",
      description: "Open this link on Easy-Locs",
      image: DEFAULT_OG_IMAGE,
      url: shareUrl,
      redirectUrl: `${APP_URL}/sl/${code}`,
    }), `${APP_URL}/sl/${code}`);
  }

  const action = String(data.action ?? "");
  const payload: Record<string, string | number | boolean | null | undefined> =
    typeof data.payload === "object" && data.payload !== null
      ? (data.payload as Record<string, string | number | boolean | null | undefined>)
      : {};
  const redirectUrl = `${APP_URL}/sl/${code}`;

  const ogImageMap: Record<string, string> = {
    pay_user: OG_PAYMENT_IMAGE,
    pay_shop: OG_PAYMENT_IMAGE,
    payment_request: OG_PAYMENT_IMAGE,
    profile: OG_PROFILE_IMAGE,
    add_contact: OG_CONTACT_IMAGE,
    shop: OG_SHOP_IMAGE,
    product: OG_SHOP_IMAGE,
    order: OG_ORDER_IMAGE,
    service: OG_SERVICE_IMAGE,
  };

  let title = "Easy-Locs";
  let desc = "Open this link on Easy-Locs";
  let image = ogImageMap[action] || DEFAULT_OG_IMAGE;

  if (action === "pay_user" || action === "pay_shop" || action === "payment_request") {
    const amount = payload.amount;
    const currency = String(payload.currency || "EUR");
    let senderName = "Someone";

    if (payload.userId) {
      const { data: sender } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", String(payload.userId))
        .maybeSingle();
      if (sender) {
        senderName = sender.display_name || senderName;
        if (sender.avatar_url) image = withCacheBust(sender.avatar_url, shareVersion);
      }
    }

    if (amount) {
      title = `${senderName} — ${amount} ${currency} — Easy-Locs`.slice(0, 60);
      desc = `Open to complete this payment on Easy-Locs`;
    } else {
      title = `Pay ${senderName} — Easy-Locs`.slice(0, 60);
      desc = `Open to send a payment on Easy-Locs`;
    }
  } else if (action === "profile") {
    if (payload.userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, updated_at")
        .eq("id", String(payload.userId))
        .maybeSingle();
      if (profile) {
        title = `${profile.display_name || "User"} — Easy-Locs`.slice(0, 60);
        desc = `View profile on Easy-Locs`;
        if (profile.avatar_url) image = withCacheBust(profile.avatar_url, shareVersion || profile.updated_at);
      }
    }
  } else if (action === "add_contact") {
    if (payload.userId) {
      const { data: contact } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, updated_at")
        .eq("id", String(payload.userId))
        .maybeSingle();
      const contactName = contact?.display_name || String(payload.name || "Someone");
      title = `Add ${contactName} — Easy-Locs`.slice(0, 60);
      desc = `Open to add ${contactName} to your contacts on Easy-Locs`.slice(0, 160);
      if (contact?.avatar_url) image = withCacheBust(contact.avatar_url, shareVersion || contact.updated_at);
      else image = OG_CONTACT_IMAGE;
    }
  } else if (action === "shop") {
    if (payload.shopSlug) {
      const { data: shop } = await supabase
        .from("shops")
        .select("name, cover_url, logo_url, updated_at")
        .eq("slug", String(payload.shopSlug))
        .maybeSingle();
      if (shop) {
        title = `${shop.name || "Shop"} — Easy-Locs`.slice(0, 60);
        desc = `Discover this shop on Easy-Locs`;
        const shopImg = shop.cover_url || shop.logo_url;
        if (shopImg) image = withCacheBust(shopImg, shareVersion || shop.updated_at);
      }
    }
  } else if (action === "product") {
    if (payload.productId) {
      const { data: product } = await supabase
        .from("products")
        .select("name, title, image_url, photo_urls, updated_at")
        .eq("id", String(payload.productId))
        .maybeSingle();
      if (product) {
        title = `${product.name || product.title || "Product"} — Easy-Locs`.slice(0, 60);
        desc = `View this product on Easy-Locs`;
        const productPhotos: string[] = Array.isArray(product.photo_urls) ? (product.photo_urls as string[]).filter(Boolean) : [];
        const productImg = product.image_url || productPhotos[0];
        if (productImg) image = withCacheBust(productImg, shareVersion || product.updated_at);
      }
    }
  } else if (action === "service") {
    const serviceSlug = payload.slug ? String(payload.slug) : null;
    if (serviceSlug) {
      const { data: svc } = await supabase
        .from("concierge_services")
        .select("title, photo_url, city, updated_at")
        .eq("booking_slug", serviceSlug)
        .maybeSingle();
      if (svc) {
        title = `${svc.title || "Service"} — Easy-Locs`.slice(0, 60);
        desc = `Book ${svc.title || "this service"}${svc.city ? ` in ${svc.city}` : ""} on Easy-Locs`.slice(0, 160);
        if (svc.photo_url) image = withCacheBust(svc.photo_url, shareVersion || svc.updated_at);
      }
    }
  } else if (action === "order") {
    title = "Your Order — Easy-Locs";
    desc = "View and track your order on Easy-Locs";
    image = OG_ORDER_IMAGE;
  }

  return buildSocialResponse(req, htmlPage({ title, description: desc, image, url: shareUrl, redirectUrl }), redirectUrl);
}

async function handleRestaurant(req: Request, slug: string, shareUrl: string, shareVersion?: string | null): Promise<Response> {
  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  const name = shop?.name || "Restaurant";
  const cuisine = shop?.cuisine_type || shop?.vertical || "";
  const city = shop?.city || "";
  const rawImage = shop?.cover_url || shop?.logo_url || OG_FOOD_IMAGE;
  const image = withCacheBust(rawImage, shareVersion || shop?.updated_at);
  const rating = shop?.average_rating ? `${shop.average_rating}★` : "";

  const title = `${name}${cuisine ? ` — ${cuisine}` : ""} | Easy-Locs Food`.slice(0, 60);
  const desc = `${name}${city ? ` in ${city}` : ""}${rating ? `. ${rating}` : ""}. Order on Easy-Locs Food.`.slice(0, 160);
  const redirectUrl = `${APP_URL}/food/restaurant/${slug}`;

  return buildSocialResponse(req, htmlPage({ title, description: desc, image, url: shareUrl, redirectUrl }), redirectUrl);
}

async function handleQuran(req: Request, slug: string, shareUrl: string, _shareVersion?: string | null): Promise<Response> {
  const title = `Surah ${slug} — Holy Quran | Easy-Locs Islamic`.slice(0, 60);
  const desc = `Read and listen to the Holy Quran on Easy-Locs Islamic — your complete companion for Quran, Hadith, Prayer Times & Qibla.`.slice(0, 160);
  const redirectUrl = `${APP_URL}/dashboard/islamic?tab=quran&surah=${slug}`;

  return buildSocialResponse(req, htmlPage({ title, description: desc, image: OG_ISLAMIC_IMAGE, url: shareUrl, redirectUrl }), redirectUrl);
}

async function handleHadith(req: Request, slug: string, shareUrl: string, _shareVersion?: string | null): Promise<Response> {
  const parts = slug.split("-");
  const collection = parts[0] || "bukhari";
  const number = parts[1] || slug;
  const title = `Hadith ${number} — ${collection.charAt(0).toUpperCase() + collection.slice(1)} | Easy-Locs Islamic`.slice(0, 60);
  const desc = `Explore authentic Hadith collections on Easy-Locs Islamic — Quran, Hadith, Prayer Times & Qibla in one place.`.slice(0, 160);
  const redirectUrl = `${APP_URL}/dashboard/islamic?tab=hadith&id=${slug}`;

  return buildSocialResponse(req, htmlPage({ title, description: desc, image: OG_ISLAMIC_IMAGE, url: shareUrl, redirectUrl }), redirectUrl);
}

async function handleForex(req: Request, slug: string, shareUrl: string, _shareVersion?: string | null): Promise<Response> {
  const pair = slug.toUpperCase().replace("-", "/");
  const title = `${pair} — Real-Time Forex Rate | Easy-Locs`.slice(0, 60);
  const desc = `Check the latest ${pair} exchange rate, view trends, and convert currencies instantly on Easy-Locs Forex.`.slice(0, 160);
  const redirectUrl = `${APP_URL}/wallet?tab=forex&pair=${slug}`;

  return buildSocialResponse(req, htmlPage({ title, description: desc, image: OG_FOREX_IMAGE, url: shareUrl, redirectUrl }), redirectUrl);
}

async function handleAnnonce(req: Request, slug: string, shareUrl: string, shareVersion?: string | null): Promise<Response> {
  const { data: annonce } = await supabase
    .from("c2c_listings")
    .select("*")
    .eq("id", slug)
    .maybeSingle();

  if (!annonce) {
    return buildBrandedFallback(req, shareUrl);
  }

  const photos: string[] = Array.isArray(annonce.photo_urls) ? annonce.photo_urls : [];
  const rawImage = photos[0] || DEFAULT_OG_IMAGE;
  const image = withCacheBust(rawImage, shareVersion || annonce.updated_at);
  const title = `${annonce.title || "Annonce"} — ${annonce.city || ""} | Easy-Locs`.slice(0, 60);
  const price = annonce.price ? `${annonce.price} ${annonce.currency || "EUR"}` : "";
  const desc = `${annonce.title || "Annonce"}${price ? ` — ${price}` : ""}${annonce.city ? ` à ${annonce.city}` : ""}. Sur Easy-Locs.`.slice(0, 160);
  const redirectUrl = `${APP_URL}/annonces/${slug}`;

  return buildSocialResponse(req, htmlPage({ title, description: desc, image, url: shareUrl, redirectUrl }), redirectUrl);
}

function handleAnalytics(req: Request, _slug: string, shareUrl: string): Response {
  const title = "Real Estate Market Analytics | Easy-Locs Property";
  const desc = "Explore real-time property market analytics, trends, and insights on Easy-Locs Property — smart real estate intelligence.";
  const redirectUrl = `${APP_URL}/dashboard/properties?tab=analytics`;

  return buildSocialResponse(req, htmlPage({ title, description: desc, image: OG_PROPERTY_IMAGE, url: shareUrl, redirectUrl }), redirectUrl);
}

function handleLocation(req: Request, slug: string, shareUrl: string): Response {
  const title = "Live Location — Easy-Locs";
  const desc = "View shared location on Easy-Locs.";
  const redirectUrl = `${APP_URL}/share-location/${slug}`;

  return buildSocialResponse(req, htmlPage({ title, description: desc, image: OG_RADAR_IMAGE, url: shareUrl, redirectUrl }), redirectUrl);
}

function buildBrandedFallback(req: Request, shareUrl: string): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Easy-Locs — The Super App for Food, Property, Forex & Services</title>
  <meta property="og:title" content="Easy-Locs — The Super App for Food, Property, Forex & Services"/>
  <meta property="og:description" content="Discover Easy-Locs — one super app powering food delivery, real estate analytics, currency exchange, and local services in 190+ countries."/>
  <meta property="og:image" content="${DEFAULT_OG_IMAGE}"/>
  <meta property="og:url" content="${escapeAttr(shareUrl)}"/>
  <meta property="og:site_name" content="${BRAND_NAME}"/>
  <style>
    body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#1a2744; font-family:'Plus Jakarta Sans',system-ui,sans-serif; color:#fff; }
    .card { text-align:center; max-width:400px; padding:40px 24px; }
    .logo { color:#d4a34a; font-size:28px; font-weight:700; letter-spacing:2px; margin-bottom:24px; }
    .msg { font-size:16px; opacity:0.8; margin-bottom:32px; }
    .cta { display:inline-block; background:#d4a34a; color:#1a2744; padding:14px 36px; border-radius:12px; text-decoration:none; font-weight:700; font-size:15px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">${BRAND_NAME}</div>
    <p class="msg">This content may have moved. Explore Easy-Locs to find what you need.</p>
    <a href="${APP_URL}" class="cta">Discover Easy-Locs</a>
  </div>
</body>
</html>`;

  return buildSocialResponse(req, html, APP_URL);
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const slug = url.searchParams.get("slug");
  const v = url.searchParams.get("v");

  if (!type || !slug) {
    return new Response(JSON.stringify({ error: "Missing type or slug" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const routeMap: Record<string, string> = {
    listing: `${APP_URL}/listing/${slug}`,
    service: `${APP_URL}/book/${slug}`,
    host: `${APP_URL}/host/${slug}`,
    provider: `${APP_URL}/provider/${slug}`,
    "real-estate": `${APP_URL}/properties/${slug}`,
    payment: `${APP_URL}/pay/link/${slug}`,
    profile: `${APP_URL}/u/${slug}`,
    contact: `${APP_URL}/add-contact?userId=${slug}`,
    shop: `${APP_URL}/s/${slug}`,
    product: `${APP_URL}/p/${slug}`,
    order: `${APP_URL}/my-orders?id=${slug}`,
    "short-link": `${APP_URL}/sl/${slug}`,
    restaurant: `${APP_URL}/food/restaurant/${slug}`,
    quran: `${APP_URL}/dashboard/islamic?tab=quran&surah=${slug}`,
    hadith: `${APP_URL}/dashboard/islamic?tab=hadith&id=${slug}`,
    forex: `${APP_URL}/wallet?tab=forex&pair=${slug}`,
    annonce: `${APP_URL}/annonces/${slug}`,
    analytics: `${APP_URL}/dashboard/properties?tab=analytics`,
    location: `${APP_URL}/share-location/${slug}`,
    deal: `${APP_URL}/deals/${slug}`,
    flight: `${APP_URL}/travel/flights?ref=${slug}`,
    ride: `${APP_URL}/mobility?ref=${slug}`,
  };
  const shareUrl = routeMap[type] || `${APP_URL}/${type}/${slug}`;

  try {
    switch (type) {
      case "listing":
        return await handleListing(req, slug, shareUrl, v);
      case "service":
        return await handleService(req, slug, shareUrl, v);
      case "host":
        return await handleHost(req, slug, shareUrl, v);
      case "provider":
        return await handleProvider(req, slug, shareUrl, v);
      case "real-estate":
        return await handleRealEstate(req, slug, shareUrl, v);
      case "payment":
      case "pay_user":
      case "pay_shop":
      case "payment_request":
        return await handlePayment(req, slug, shareUrl, v);
      case "profile":
        return await handleProfile(req, slug, shareUrl, v);
      case "contact":
        return await handleContact(req, slug, shareUrl, v);
      case "shop":
        return await handleShop(req, slug, shareUrl, v);
      case "product":
        return await handleProduct(req, slug, shareUrl, v);
      case "order":
        return await handleOrder(req, slug, shareUrl, v);
      case "short-link":
        return await handleShortLink(req, slug, shareUrl, v);
      case "restaurant":
        return await handleRestaurant(req, slug, shareUrl, v);
      case "quran":
        return await handleQuran(req, slug, shareUrl, v);
      case "hadith":
        return await handleHadith(req, slug, shareUrl, v);
      case "forex":
        return await handleForex(req, slug, shareUrl, v);
      case "annonce":
        return await handleAnnonce(req, slug, shareUrl, v);
      case "analytics":
        return handleAnalytics(req, slug, shareUrl);
      case "location":
        return handleLocation(req, slug, shareUrl);
      case "deal":
      case "flight":
      case "ride":
        return buildSocialResponse(req, htmlPage({
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} — Easy-Locs`,
          description: `Discover this on Easy-Locs`,
          image: DEFAULT_OG_IMAGE,
          url: shareUrl,
          redirectUrl: routeMap[type] || `${APP_URL}`,
        }), routeMap[type] || `${APP_URL}`);
      default:
        return buildBrandedFallback(req, shareUrl);
    }
  } catch (err) {
    console.error("social-preview error:", err);
    return buildBrandedFallback(req, shareUrl);
  }
});
