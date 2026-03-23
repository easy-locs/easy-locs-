/**
 * SEO Engine
 * Generates meta tags, titles, structured data for merchant and city pages.
 */

export interface SEOMeta {
  title: string;
  description: string;
  canonicalUrl: string;
  jsonLd: Record<string, unknown>;
}

export function generateMerchantSEO(params: {
  merchantName: string;
  city: string;
  category?: string;
  slug: string;
  baseUrl?: string;
}): SEOMeta {
  const base = params.baseUrl ?? "https://easy-locs.lovable.app";
  const cat = params.category ?? "restaurant";

  return {
    title: `${params.merchantName} — Order from ${cat} in ${params.city} | Easy-Locs`,
    description: `Order from ${params.merchantName} in ${params.city}. Fast delivery, easy ordering. Browse the menu and order now on Easy-Locs.`,
    canonicalUrl: `${base}/s/${params.slug}`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Restaurant",
      name: params.merchantName,
      address: { "@type": "PostalAddress", addressLocality: params.city },
      url: `${base}/s/${params.slug}`,
    },
  };
}

export function generateCitySEO(params: {
  city: string;
  countryName: string;
  merchantCount: number;
  baseUrl?: string;
}): SEOMeta {
  const base = params.baseUrl ?? "https://easy-locs.lovable.app";
  const slug = params.city.toLowerCase().replace(/\s+/g, "-");

  return {
    title: `Best Food Delivery in ${params.city}, ${params.countryName} | Easy-Locs`,
    description: `Discover ${params.merchantCount}+ restaurants in ${params.city}. Order food delivery from the best local restaurants on Easy-Locs.`,
    canonicalUrl: `${base}/city/${slug}`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Restaurants in ${params.city}`,
      numberOfItems: params.merchantCount,
      url: `${base}/city/${slug}`,
    },
  };
}
