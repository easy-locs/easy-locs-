import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BRAND_NAME = "EASY-LOCS®";
const APP_URL = Deno.env.get("APP_URL") || "https://easy-locs.lovable.app";
const DEFAULT_OG_IMAGE = `${APP_URL}/pwa-512x512.png`;

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

function withCacheBust(image: string | null | undefined, version?: string | null): string {
  const base = image || DEFAULT_OG_IMAGE;
  const token = toVersionToken(version);
  if (!token) return base;
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}v=${encodeURIComponent(token)}`;
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
  const safeTitle = meta.title.replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const safeDesc = meta.description.replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const safeImage = meta.image || DEFAULT_OG_IMAGE;
  const safeUrl = meta.url;
  const safeRedirectUrl = meta.redirectUrl;

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
  <script>window.location.replace(${JSON.stringify(safeRedirectUrl)});</script>
  <noscript><meta http-equiv="refresh" content="0;url=${safeRedirectUrl}"/></noscript>
</head>
<body>
  <p>Redirecting to <a href="${safeRedirectUrl}">${safeTitle}</a>...</p>
</body>
</html>`;
}

function buildHeaders() {
  return {
    ...corsHeaders,
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "public, max-age=60",
  };
}

function redirectToApp(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      Location: url,
      "Cache-Control": "no-store",
    },
  });
}

function buildSocialResponse(req: Request, html: string, redirectUrl: string): Response {
  if (!shouldServePreviewHtml(req)) {
    return redirectToApp(redirectUrl);
  }

  return new Response(html, { status: 200, headers: buildHeaders() });
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

  const { data: property } = await supabase.rpc("get_listing_property", { p_listing_id: listing.id });

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
  const { data: service } = await supabase
    .from("concierge_services")
    .select("*")
    .eq("booking_slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!service) {
    return new Response("Not found", { status: 404, headers: { ...corsHeaders } });
  }

  const photos: string[] = Array.isArray(service.photo_urls) ? (service.photo_urls as string[]) : [];
  const rawImage = service.photo_url || photos[0] || DEFAULT_OG_IMAGE;
  const image = withCacheBust(rawImage, shareVersion || service.updated_at || null);
  const title = `${service.title} — ${service.city || ""} | Easy-Locs`.slice(0, 60);
  const desc = `${service.title}${service.city ? ` in ${service.city}` : ""}. ${service.price > 0 ? `From ${service.price} ${service.currency}.` : ""} Book on Easy-Locs.`.slice(0, 160);
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
    .from("marketplace_services")
    .select("photo_urls, updated_at")
    .eq("provider_id", provider.id)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const firstServicePhoto = Array.isArray(firstService?.photo_urls) ? String(firstService.photo_urls[0] || "") : "";
  const rawImage = provider.cover_photo_url || provider.avatar_url || firstServicePhoto || DEFAULT_OG_IMAGE;
  const image = withCacheBust(rawImage, shareVersion || provider.updated_at || firstService?.updated_at || null);
  const title = `${provider.display_name} — Services | Easy-Locs`.slice(0, 60);
  const desc = `${provider.bio?.slice(0, 120) || `Discover services by ${provider.display_name}`}`.slice(0, 160);
  const redirectUrl = `${APP_URL}/provider/${slug}`;

  return buildSocialResponse(req, htmlPage({ title, description: desc, image, url: shareUrl, redirectUrl, type: "profile" }), redirectUrl);
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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

  const shareParams = new URLSearchParams({ type, slug });
  if (v) shareParams.set("v", v);
  const functionsBase = `${Deno.env.get("SUPABASE_URL")}/functions/v1/social-preview`;
  const shareUrl = `${functionsBase}?${shareParams.toString()}`;

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
      default:
        return new Response("Unknown type", { status: 400, headers: corsHeaders });
    }
  } catch (err) {
    console.error("social-preview error:", err);
    return new Response("Error", { status: 500, headers: corsHeaders });
  }
});
