export interface JSONLDBase {
  "@context": "https://schema.org";
  "@type": string;
}

export interface JSONLDOrganization extends JSONLDBase {
  "@type": "Organization";
  name: string;
  url: string;
  logo: string;
  description: string;
  sameAs: string[];
  contactPoint: {
    "@type": "ContactPoint";
    telephone: string;
    contactType: string;
    availableLanguage: string[];
  };
}

export interface JSONLDRestaurant extends JSONLDBase {
  "@type": "Restaurant";
  name: string;
  image: string;
  url: string;
  address: {
    "@type": "PostalAddress";
    streetAddress: string;
    addressLocality: string;
    addressCountry: string;
    postalCode?: string;
  };
  geo?: {
    "@type": "GeoCoordinates";
    latitude: number;
    longitude: number;
  };
  servesCuisine?: string[];
  priceRange?: string;
  aggregateRating?: {
    "@type": "AggregateRating";
    ratingValue: number;
    reviewCount: number;
  };
  openingHours?: string[];
}

export interface JSONLDHotel extends JSONLDBase {
  "@type": "Hotel";
  name: string;
  image: string;
  url: string;
  address: {
    "@type": "PostalAddress";
    streetAddress: string;
    addressLocality: string;
    addressCountry: string;
  };
  geo?: {
    "@type": "GeoCoordinates";
    latitude: number;
    longitude: number;
  };
  starRating?: { "@type": "Rating"; ratingValue: number };
  priceRange?: string;
  aggregateRating?: {
    "@type": "AggregateRating";
    ratingValue: number;
    reviewCount: number;
  };
  amenityFeature?: Array<{ "@type": "LocationFeatureSpecification"; name: string; value: boolean }>;
}

export interface JSONLDProduct extends JSONLDBase {
  "@type": "Product";
  name: string;
  image: string;
  description: string;
  url: string;
  brand?: { "@type": "Brand"; name: string };
  offers: {
    "@type": "Offer";
    price: number;
    priceCurrency: string;
    availability: string;
    seller?: { "@type": "Organization"; name: string };
  };
  aggregateRating?: {
    "@type": "AggregateRating";
    ratingValue: number;
    reviewCount: number;
  };
}

export interface JSONLDLocalBusiness extends JSONLDBase {
  "@type": "LocalBusiness";
  name: string;
  image: string;
  url: string;
  description: string;
  address: {
    "@type": "PostalAddress";
    streetAddress: string;
    addressLocality: string;
    addressCountry: string;
  };
  geo?: {
    "@type": "GeoCoordinates";
    latitude: number;
    longitude: number;
  };
  telephone?: string;
  priceRange?: string;
}

export interface JSONLDBreadcrumb extends JSONLDBase {
  "@type": "BreadcrumbList";
  itemListElement: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }>;
}

export interface JSONLDWebApplication extends JSONLDBase {
  "@type": "WebApplication";
  name: string;
  url: string;
  description: string;
  applicationCategory: string;
  operatingSystem: string;
  offers: { "@type": "Offer"; price: string; priceCurrency: string };
}

export function buildOrganizationLD(): JSONLDOrganization {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Easy-Locs",
    url: "https://easy-locs.com",
    logo: "https://easy-locs.com/pwa-512x512.png",
    description: "Order food, book taxis, find hotels, get deliveries and local services — all in one super app.",
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "",
      contactType: "customer service",
      availableLanguage: ["English", "French", "Arabic", "Spanish", "German", "Portuguese", "Turkish", "Chinese", "Hindi", "Swahili"],
    },
  };
}

export function buildRestaurantLD(restaurant: {
  name: string; image: string; address: string; city: string; country: string;
  lat?: number; lng?: number; cuisines?: string[]; priceRange?: string;
  rating?: number; reviewCount?: number; openingHours?: string[];
}): JSONLDRestaurant {
  const ld: JSONLDRestaurant = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: restaurant.name,
    image: restaurant.image,
    url: `https://easy-locs.com/food/restaurant/${encodeURIComponent(restaurant.name.toLowerCase().replace(/\s+/g, "-"))}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: restaurant.address,
      addressLocality: restaurant.city,
      addressCountry: restaurant.country,
    },
  };
  if (restaurant.lat && restaurant.lng) {
    ld.geo = { "@type": "GeoCoordinates", latitude: restaurant.lat, longitude: restaurant.lng };
  }
  if (restaurant.cuisines) ld.servesCuisine = restaurant.cuisines;
  if (restaurant.priceRange) ld.priceRange = restaurant.priceRange;
  if (restaurant.rating && restaurant.reviewCount) {
    ld.aggregateRating = { "@type": "AggregateRating", ratingValue: restaurant.rating, reviewCount: restaurant.reviewCount };
  }
  if (restaurant.openingHours) ld.openingHours = restaurant.openingHours;
  return ld;
}

export function buildHotelLD(hotel: {
  name: string; image: string; address: string; city: string; country: string;
  lat?: number; lng?: number; stars?: number; priceRange?: string;
  rating?: number; reviewCount?: number; amenities?: string[];
}): JSONLDHotel {
  const ld: JSONLDHotel = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: hotel.name,
    image: hotel.image,
    url: `https://easy-locs.com/travel/hotel/${encodeURIComponent(hotel.name.toLowerCase().replace(/\s+/g, "-"))}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: hotel.address,
      addressLocality: hotel.city,
      addressCountry: hotel.country,
    },
  };
  if (hotel.lat && hotel.lng) {
    ld.geo = { "@type": "GeoCoordinates", latitude: hotel.lat, longitude: hotel.lng };
  }
  if (hotel.stars) ld.starRating = { "@type": "Rating", ratingValue: hotel.stars };
  if (hotel.priceRange) ld.priceRange = hotel.priceRange;
  if (hotel.rating && hotel.reviewCount) {
    ld.aggregateRating = { "@type": "AggregateRating", ratingValue: hotel.rating, reviewCount: hotel.reviewCount };
  }
  if (hotel.amenities) {
    ld.amenityFeature = hotel.amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a, value: true }));
  }
  return ld;
}

export function buildProductLD(product: {
  name: string; image: string; description: string; price: number;
  currency: string; availability: boolean; seller?: string; brand?: string;
  rating?: number; reviewCount?: number;
}): JSONLDProduct {
  const ld: JSONLDProduct = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.image,
    description: product.description,
    url: `https://easy-locs.com/shop/product/${encodeURIComponent(product.name.toLowerCase().replace(/\s+/g, "-"))}`,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency,
      availability: product.availability ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
  if (product.brand) ld.brand = { "@type": "Brand", name: product.brand };
  if (product.seller) ld.offers.seller = { "@type": "Organization", name: product.seller };
  if (product.rating && product.reviewCount) {
    ld.aggregateRating = { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviewCount };
  }
  return ld;
}

export function buildBreadcrumbLD(items: Array<{ name: string; url: string }>): JSONLDBreadcrumb {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildWebAppLD(): JSONLDWebApplication {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Easy-Locs",
    url: "https://easy-locs.com",
    description: "Food, Taxi, Hotel, Delivery, Commerce — all in one super app for 190+ countries.",
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}

export interface MetaTags {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
  ogType: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  canonical: string;
  locale: string;
  alternateLocales?: string[];
}

export function buildMetaTags(params: {
  title: string;
  description: string;
  image?: string;
  url: string;
  type?: string;
  locale?: string;
}): MetaTags {
  const ogImage = params.image || "https://easy-locs.com/og-default.png";
  return {
    title: `${params.title} | Easy-Locs`,
    description: params.description,
    ogTitle: params.title,
    ogDescription: params.description,
    ogImage,
    ogUrl: params.url,
    ogType: params.type || "website",
    twitterCard: "summary_large_image",
    twitterTitle: params.title,
    twitterDescription: params.description,
    twitterImage: ogImage,
    canonical: params.url,
    locale: params.locale || "en_US",
    alternateLocales: ["fr_FR", "ar_SA", "es_ES", "de_DE", "pt_BR", "tr_TR", "zh_CN", "hi_IN"],
  };
}

export interface DeepLinkConfig {
  ios: { appId: string; paths: string[] };
  android: { packageName: string; sha256CertFingerprints: string[]; paths: string[] };
}

export function generateAppleAppSiteAssociation(appId: string, paths: string[]): object {
  return {
    applinks: {
      apps: [],
      details: [{ appID: appId, paths }],
    },
    webcredentials: { apps: [appId] },
  };
}

export function generateAssetLinks(packageName: string, fingerprints: string[]): object[] {
  return [{
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: packageName,
      sha256_cert_fingerprints: fingerprints,
    },
  }];
}

export function generateSitemapEntries(baseUrl: string): Array<{ loc: string; changefreq: string; priority: number }> {
  return [
    { loc: `${baseUrl}/`, changefreq: "daily", priority: 1.0 },
    { loc: `${baseUrl}/explore`, changefreq: "daily", priority: 0.9 },
    { loc: `${baseUrl}/food`, changefreq: "daily", priority: 0.8 },
    { loc: `${baseUrl}/taxi`, changefreq: "daily", priority: 0.8 },
    { loc: `${baseUrl}/hotels`, changefreq: "daily", priority: 0.8 },
    { loc: `${baseUrl}/delivery`, changefreq: "daily", priority: 0.8 },
    { loc: `${baseUrl}/shop`, changefreq: "daily", priority: 0.7 },
    { loc: `${baseUrl}/real-estate`, changefreq: "weekly", priority: 0.7 },
    { loc: `${baseUrl}/privacy`, changefreq: "monthly", priority: 0.3 },
    { loc: `${baseUrl}/terms`, changefreq: "monthly", priority: 0.3 },
    { loc: `${baseUrl}/about`, changefreq: "monthly", priority: 0.5 },
    { loc: `${baseUrl}/help`, changefreq: "monthly", priority: 0.4 },
  ];
}
