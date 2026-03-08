import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRAND_NAME = "EASY-LOCS®";
const APP_URL = "https://www.easy-locs.com";
const DEFAULT_OG_IMAGE = `${APP_URL}/pwa-512x512.png`;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Detect social crawlers by user-agent
function isCrawler(ua: string): boolean {
  const crawlers = [
    "facebookexternalhit", "Facebot", "Twitterbot", "LinkedInBot",
    "WhatsApp", "TelegramBot", "Slackbot", "Discordbot",
    "Pinterest", "Googlebot", "bingbot", "iMessageBot",
    "vkShare", "W3C_Validator", "redditbot", "Applebot",
  ];
  return crawlers.some(c => ua.toLowerCase().includes(c.toLowerCase()));
}

function htmlPage(meta: {
  title: string;
  description: string;
  image: string;
  url: string;
  type?: string;
  jsonLd?: Record<string, unknown>;
}): string {
  const safeTitle = meta.title.replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const safeDesc = meta.description.replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const safeImage = meta.image || DEFAULT_OG_IMAGE;
  const safeUrl = meta.url;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}"/>
  
  <!-- Open Graph -->
  <meta property="og:type" content="${meta.type || "website"}"/>
  <meta property="og:title" content="${safeTitle}"/>
  <meta property="og:description" content="${safeDesc}"/>
  <meta property="og:image" content="${safeImage}"/>
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
  
  <!-- Redirect real browsers -->
  <meta http-equiv="refresh" content="0;url=${safeUrl}"/>
</head>
<body>
  <p>Redirecting to <a href="${safeUrl}">${safeTitle}</a>...</p>
</body>
</html>`;
}

async function handleListing(slug: string): Promise<Response> {
  const { data: listing } = await supabase
    .from("public_listings")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!listing) {
    return new Response("Not found", { status: 404 });
  }

  // Get property details
  const { data: property } = await supabase.rpc("get_listing_property", { p_listing_id: listing.id });

  const title = `${listing.title || property?.label || "Vacation Rental"} — ${property?.city || listing.city || ""} | Easy-Locs`.slice(0, 60);
  const desc = `${listing.title || property?.label || "Rental"} in ${property?.city || ""}${property?.country ? `, ${property.country}` : ""}. ${listing.max_guests ? `Up to ${listing.max_guests} guests.` : ""} Book directly on Easy-Locs.`.slice(0, 160);
  
  const photos: string[] = property?.photo_urls || [];
  const image = listing.cover_url || photos[0] || DEFAULT_OG_IMAGE;
  const url = `${APP_URL}/listing/${slug}`;

  return new Response(htmlPage({
    title, description: desc, image, url,
    type: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "LodgingBusiness",
      name: listing.title || property?.label,
      description: listing.description?.slice(0, 300) || desc,
      url,
      image,
      address: {
        "@type": "PostalAddress",
        addressLocality: property?.city,
        addressCountry: property?.country,
      },
      ...(listing.price_per_night > 0 ? {
        priceRange: `€${listing.price_per_night}/night`,
        offers: { "@type": "Offer", price: listing.price_per_night, priceCurrency: listing.currency || "EUR" },
      } : {}),
    },
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}

async function handleService(slug: string): Promise<Response> {
  const { data: service } = await supabase
    .from("concierge_services")
    .select("*")
    .eq("booking_slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!service) {
    return new Response("Not found", { status: 404 });
  }

  const photos: string[] = Array.isArray(service.photo_urls) ? service.photo_urls as string[] : [];
  const image = service.photo_url || photos[0] || DEFAULT_OG_IMAGE;
  const title = `${service.title} — ${service.city || ""} | Easy-Locs`.slice(0, 60);
  const desc = `${service.title}${service.city ? ` in ${service.city}` : ""}. ${service.price > 0 ? `From ${service.price} ${service.currency}.` : ""} Book on Easy-Locs.`.slice(0, 160);
  const url = `${APP_URL}/book/${slug}`;

  return new Response(htmlPage({ title, description: desc, image, url, type: "website" }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}

async function handleHost(slug: string): Promise<Response> {
  const { data: host } = await supabase
    .from("landlord_profiles")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!host) {
    return new Response("Not found", { status: 404 });
  }

  const image = host.avatar_url || DEFAULT_OG_IMAGE;
  const title = `${host.display_name} — Properties on Easy-Locs`.slice(0, 60);
  const desc = `Browse vacation rentals by ${host.display_name}${host.city ? ` in ${host.city}` : ""}. Book directly on Easy-Locs.`.slice(0, 160);
  const url = `${APP_URL}/host/${slug}`;

  return new Response(htmlPage({ title, description: desc, image, url, type: "profile" }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}

async function handleProvider(slug: string): Promise<Response> {
  const { data: provider } = await supabase
    .from("marketplace_providers")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!provider) {
    return new Response("Not found", { status: 404 });
  }

  const image = provider.cover_photo_url || provider.avatar_url || DEFAULT_OG_IMAGE;
  const title = `${provider.display_name} — Services | Easy-Locs`.slice(0, 60);
  const desc = `${provider.bio?.slice(0, 120) || `Discover services by ${provider.display_name}`}`.slice(0, 160);
  const url = `${APP_URL}/provider/${slug}`;

  return new Response(htmlPage({ title, description: desc, image, url, type: "profile" }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const slug = url.searchParams.get("slug");
  const ua = req.headers.get("user-agent") || "";

  if (!type || !slug) {
    return new Response(JSON.stringify({ error: "Missing type or slug" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // If not a crawler, redirect immediately to the SPA page
  if (!isCrawler(ua)) {
    const pathMap: Record<string, string> = {
      listing: `/listing/${slug}`,
      service: `/book/${slug}`,
      host: `/host/${slug}`,
      provider: `/provider/${slug}`,
    };
    const redirectPath = pathMap[type] || `/`;
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: `${APP_URL}${redirectPath}` },
    });
  }

  try {
    switch (type) {
      case "listing": return await handleListing(slug);
      case "service": return await handleService(slug);
      case "host": return await handleHost(slug);
      case "provider": return await handleProvider(slug);
      default:
        return new Response("Unknown type", { status: 400, headers: corsHeaders });
    }
  } catch (err: any) {
    console.error("social-preview error:", err);
    return new Response("Error", { status: 500, headers: corsHeaders });
  }
});
