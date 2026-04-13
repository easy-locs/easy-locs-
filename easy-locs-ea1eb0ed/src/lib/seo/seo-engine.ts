/**
 * SEO Engine
 * Generates meta tags, titles, and structured data for merchant, city, and
 * programmatic vertical pages across all active verticals.
 *
 * Verticals with full JSON-LD: food, grocery, services, property, travel/stay
 */

export interface SEOMeta {
  title: string;
  description: string;
  canonicalUrl: string;
  jsonLd: Record<string, unknown> | Record<string, unknown>[];
}

const BASE_URL = "https://www.easy-locs.com";

const SCHEMA_TYPE_MAP: Record<string, string> = {
  food: "Restaurant",
  grocery: "GroceryStore",
  shops: "Store",
  services: "LocalBusiness",
  healthcare: "MedicalOrganization",
  fitness: "ExerciseGym",
  beauty: "BeautySalon",
  property: "RealEstateAgent",
  stay: "LodgingBusiness",
  hotel: "Hotel",
  mobility: "TaxiService",
  experiences: "EntertainmentBusiness",
  utility: "LocalBusiness",
};

function schemaTypeForVertical(vertical: string): string {
  return SCHEMA_TYPE_MAP[vertical] ?? "LocalBusiness";
}

export function generateMerchantSEO(params: {
  merchantName: string;
  city: string;
  category?: string;
  vertical?: string;
  slug: string;
  description?: string;
  address?: string;
  phone?: string;
  priceRange?: string;
  baseUrl?: string;
}): SEOMeta {
  const base = params.baseUrl ?? BASE_URL;
  const vertical = params.vertical ?? "food";
  const cat = params.category ?? vertical;
  const schemaType = schemaTypeForVertical(vertical);
  const url = `${base}/s/${params.slug}`;

  const title = `${params.merchantName} — ${cat} in ${params.city} | Easy-Locs`;
  const description = params.description
    ?? `Discover ${params.merchantName} in ${params.city}. Browse services, compare and book on Easy-Locs.`;

  const baseSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
    name: params.merchantName,
    url,
    address: {
      "@type": "PostalAddress",
      addressLocality: params.city,
      ...(params.address ? { streetAddress: params.address } : {}),
    },
    ...(params.phone ? { telephone: params.phone } : {}),
    ...(params.priceRange ? { priceRange: params.priceRange } : {}),
  };

  const breadcrumb: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Easy-Locs", item: base },
      { "@type": "ListItem", position: 2, name: params.city, item: `${base}/city/${params.city.toLowerCase().replace(/\s+/g, "-")}` },
      { "@type": "ListItem", position: 3, name: params.merchantName, item: url },
    ],
  };

  return {
    title,
    description,
    canonicalUrl: url,
    jsonLd: [baseSchema, breadcrumb],
  };
}

export function generateCitySEO(params: {
  city: string;
  countryName: string;
  merchantCount: number;
  vertical?: string;
  baseUrl?: string;
}): SEOMeta {
  const base = params.baseUrl ?? BASE_URL;
  const slug = params.city.toLowerCase().replace(/\s+/g, "-");
  const vertical = params.vertical ?? "food";

  const isFood = vertical === "food";
  const title = isFood
    ? `Best Food Delivery in ${params.city}, ${params.countryName} | Easy-Locs`
    : `${params.city} — ${params.vertical ?? "Services"} | Easy-Locs`;

  const description = isFood
    ? `Discover ${params.merchantCount}+ restaurants in ${params.city}. Order food delivery from the best local restaurants on Easy-Locs.`
    : `Find ${params.merchantCount}+ local providers in ${params.city}. Book services and explore on Easy-Locs.`;

  const url = `${base}/city/${slug}`;

  return {
    title,
    description,
    canonicalUrl: url,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${params.vertical ?? "Services"} in ${params.city}`,
      numberOfItems: params.merchantCount,
      url,
    },
  };
}

export function generateServiceCitySEO(params: {
  serviceLabel: string;
  serviceType: string;
  city: string;
  countryName: string;
  currency?: string;
  slug: string;
  baseUrl?: string;
}): SEOMeta {
  const base = params.baseUrl ?? BASE_URL;
  const url = `${base}/services/${params.slug}`;

  const jsonLd: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: `${params.serviceLabel} in ${params.city}`,
      serviceType: params.serviceType,
      description: `${params.serviceLabel} in ${params.city}, ${params.countryName}. Book online with local providers.`,
      url,
      areaServed: {
        "@type": "City",
        name: params.city,
        containedInPlace: { "@type": "Country", name: params.countryName },
      },
      provider: { "@type": "Organization", name: "Easy-Locs", url: base },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Easy-Locs", item: base },
        { "@type": "ListItem", position: 2, name: "Services", item: `${base}/services` },
        { "@type": "ListItem", position: 3, name: params.serviceLabel, item: `${base}/services/${params.serviceType}` },
        { "@type": "ListItem", position: 4, name: params.city, item: url },
      ],
    },
  ];

  return {
    title: `${params.serviceLabel} in ${params.city}, ${params.countryName} | Easy-Locs`,
    description: `Book ${params.serviceLabel.toLowerCase()} in ${params.city}. Find local providers and book online on Easy-Locs.`,
    canonicalUrl: url,
    jsonLd,
  };
}

export function generatePropertySEO(params: {
  listingTitle: string;
  city: string;
  countryName: string;
  bedrooms?: number;
  pricePerMonth?: number;
  currency?: string;
  slug: string;
  baseUrl?: string;
}): SEOMeta {
  const base = params.baseUrl ?? BASE_URL;
  const url = `${base}/property/${params.slug}`;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: params.listingTitle,
    url,
    address: {
      "@type": "PostalAddress",
      addressLocality: params.city,
      addressCountry: params.countryName,
    },
    ...(params.bedrooms !== undefined ? { numberOfBedrooms: params.bedrooms } : {}),
    ...(params.pricePerMonth !== undefined ? {
      offers: {
        "@type": "Offer",
        price: params.pricePerMonth,
        priceCurrency: params.currency ?? "USD",
      },
    } : {}),
  };

  return {
    title: `${params.listingTitle} in ${params.city} | Easy-Locs`,
    description: `Discover ${params.listingTitle} in ${params.city}, ${params.countryName}. View details and contact the agent on Easy-Locs.`,
    canonicalUrl: url,
    jsonLd,
  };
}

export function generateTravelSEO(params: {
  hotelName: string;
  city: string;
  countryName: string;
  starRating?: number;
  pricePerNight?: number;
  currency?: string;
  slug: string;
  baseUrl?: string;
}): SEOMeta {
  const base = params.baseUrl ?? BASE_URL;
  const url = `${base}/hotel/${params.slug}`;

  const jsonLd: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "Hotel",
      name: params.hotelName,
      url,
      address: {
        "@type": "PostalAddress",
        addressLocality: params.city,
        addressCountry: params.countryName,
      },
      ...(params.starRating !== undefined ? { starRating: { "@type": "Rating", ratingValue: params.starRating } } : {}),
      ...(params.pricePerNight !== undefined ? {
        offers: {
          "@type": "Offer",
          price: params.pricePerNight,
          priceCurrency: params.currency ?? "USD",
          priceSpecification: { "@type": "UnitPriceSpecification", unitText: "NIGHT" },
        },
      } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Easy-Locs", item: base },
        { "@type": "ListItem", position: 2, name: "Travel", item: `${base}/travel` },
        { "@type": "ListItem", position: 3, name: params.city, item: `${base}/city/${params.city.toLowerCase().replace(/\s+/g, "-")}` },
        { "@type": "ListItem", position: 4, name: params.hotelName, item: url },
      ],
    },
  ];

  return {
    title: `${params.hotelName} in ${params.city}, ${params.countryName} | Easy-Locs`,
    description: `Book ${params.hotelName} in ${params.city}. Compare rates and book your stay on Easy-Locs.`,
    canonicalUrl: url,
    jsonLd,
  };
}

export function generateVerticalSEO(params: {
  vertical: string;
  entityName: string;
  city: string;
  countryName: string;
  slug: string;
  description?: string;
  extra?: Record<string, unknown>;
  baseUrl?: string;
}): SEOMeta {
  switch (params.vertical) {
    case "services":
      return generateServiceCitySEO({
        serviceLabel: params.entityName,
        serviceType: params.slug,
        city: params.city,
        countryName: params.countryName,
        slug: params.slug,
        baseUrl: params.baseUrl,
      });
    case "property":
      return generatePropertySEO({
        listingTitle: params.entityName,
        city: params.city,
        countryName: params.countryName,
        slug: params.slug,
        baseUrl: params.baseUrl,
        ...(params.extra ?? {}),
      });
    case "stay":
    case "hotel":
      return generateTravelSEO({
        hotelName: params.entityName,
        city: params.city,
        countryName: params.countryName,
        slug: params.slug,
        baseUrl: params.baseUrl,
        ...(params.extra ?? {}),
      });
    default:
      return generateMerchantSEO({
        merchantName: params.entityName,
        city: params.city,
        vertical: params.vertical,
        slug: params.slug,
        description: params.description,
        baseUrl: params.baseUrl,
      });
  }
}
