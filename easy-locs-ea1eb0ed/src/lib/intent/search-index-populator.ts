import { intentSearchIndex, type SearchableEntity } from "./search-index";
import { FALLBACK_STORIES } from "@/data/fallback-stories";
import { FALLBACK_PROPERTIES } from "@/data/fallback-properties";
import { FALLBACK_HOTELS } from "@/data/fallback-hotels";
import { FALLBACK_SHOPS, FALLBACK_GROCERY } from "@/data/fallback-shops";
import { FALLBACK_SERVICES } from "@/data/fallback-services";
import { isQuarantined } from "@/lib/data-quality/quarantine";
import { isSearchExcluded } from "@/lib/data-quality/engines/search-hygiene-engine";
import { isSuppressedFromSurface } from "@/lib/data-quality/engines/live-surface-sanitizer-engine";

export function populateSearchIndex() {
  intentSearchIndex.clear();
  const entities: SearchableEntity[] = [];

  for (const story of FALLBACK_STORIES) {
    entities.push({
      entityId: story.entityId,
      entityType: story.entityType,
      vertical: story.vertical,
      categoryKey: story.categoryKey,
      subcategoryKey: story.subcategoryKey,
      title: story.title,
      keywords: [
        story.storyType,
        story.vertical,
        story.categoryKey,
        story.subcategoryKey,
        story.locationLabel ?? "",
        story.subtitle ?? "",
      ].filter(Boolean),
      locationLabel: story.locationLabel,
      priceLabel: story.priceLabel,
      rankScore: (story.rankingSignals.quality ?? 0) * 0.4 +
        (story.rankingSignals.freshness ?? 0) * 0.3 +
        (story.rankingSignals.popularity ?? 0) * 0.3,
    });
  }

  for (const prop of FALLBACK_PROPERTIES) {
    const priceValue = prop.totalPrice ?? prop.annualRent ?? prop.monthlyRent ?? 0;
    entities.push({
      entityId: prop.id,
      entityType: "property",
      vertical: "property",
      categoryKey: "property",
      subcategoryKey: prop.subcategory || "buy_apartment",
      title: prop.title,
      keywords: [
        prop.area,
        prop.city,
        prop.developer || "",
        prop.intent,
        prop.subcategory || "",
        `${prop.bedrooms} bedroom`,
        `${prop.bathrooms} bathroom`,
      ].filter(Boolean),
      locationLabel: `${prop.area}, ${prop.city}`,
      priceLabel: priceValue > 0 ? `${priceValue.toLocaleString()} ${prop.currency}` : undefined,
      rankScore: prop.ranking_score ?? 70,
    });
  }

  for (const hotel of FALLBACK_HOTELS) {
    const lowestPrice = hotel.room_types?.length
      ? Math.min(...hotel.room_types.map((r) => r.price_per_night ?? Infinity))
      : undefined;
    entities.push({
      entityId: hotel.id,
      entityType: "stay",
      vertical: "stay",
      categoryKey: "stay",
      subcategoryKey: hotel.subcategory || "hotel",
      title: hotel.name,
      keywords: [
        hotel.address,
        hotel.city,
        hotel.region,
        hotel.subcategory || "hotel",
        ...(hotel.amenities || []),
      ].filter(Boolean),
      locationLabel: `${hotel.address}, ${hotel.city}`,
      priceLabel: lowestPrice && lowestPrice < Infinity ? `from ${lowestPrice} ${hotel.currency}/night` : undefined,
      rating: hotel.rating,
      rankScore: hotel.ranking_score ?? (hotel.rating ?? 0) * 15,
    });
  }

  for (const shop of FALLBACK_SHOPS) {
    entities.push({
      entityId: shop.id,
      entityType: "merchant",
      vertical: "shops",
      categoryKey: "shops",
      subcategoryKey: shop.subcategory || "retail",
      title: shop.name,
      keywords: [
        shop.subcategory,
        shop.region,
        shop.city,
        shop.category,
        "shop",
        "store",
        "retail",
      ].filter(Boolean),
      locationLabel: `${shop.address}, ${shop.city}`,
      rating: shop.rating,
      rankScore: shop.ranking_score ?? 70,
    });
  }

  for (const grocery of FALLBACK_GROCERY) {
    entities.push({
      entityId: grocery.id,
      entityType: "merchant",
      vertical: "grocery",
      categoryKey: "grocery",
      subcategoryKey: grocery.subcategory || "supermarket",
      title: grocery.name,
      keywords: [
        grocery.subcategory,
        grocery.region,
        grocery.city,
        "grocery",
        "supermarket",
        "fresh",
        "produce",
      ].filter(Boolean),
      locationLabel: `${grocery.address}, ${grocery.city}`,
      rating: grocery.rating,
      rankScore: grocery.ranking_score ?? 70,
    });
  }

  for (const svc of FALLBACK_SERVICES) {
    entities.push({
      entityId: svc.id,
      entityType: "provider",
      vertical: "services",
      categoryKey: "services",
      subcategoryKey: svc.subcategory || "general",
      title: svc.name,
      keywords: [
        svc.subcategory,
        svc.region,
        svc.city,
        ...(svc.service_tags || []),
      ].filter(Boolean),
      locationLabel: `${svc.address}, ${svc.city}`,
      priceLabel: svc.starting_price > 0 ? `from ${svc.starting_price} ${svc.currency}` : undefined,
      rating: svc.rating,
      rankScore: svc.ranking_score ?? 70,
    });
  }

  addNavigationEntities(entities);

  let clean: SearchableEntity[];
  try {
    clean = entities.filter((e) => {
      if (isQuarantined(e.entityId)) return false;
      if (isSearchExcluded(e.entityId)) return false;
      if (isSuppressedFromSurface(e.entityId)) return false;
      return true;
    });
  } catch {
    clean = entities;
  }
  intentSearchIndex.register(clean);

  if (import.meta.env.DEV) {
    const excludedCount = entities.length - clean.length;
    console.log(
      `[search-index] Populated with ${intentSearchIndex.size} entities` +
      (excludedCount > 0 ? ` (${excludedCount} excluded by quarantine/surface/search filters)` : "")
    );
  }
}

const NAV_PAGES: Array<{ id: string; title: string; keywords: string[]; vertical: string; path: string }> = [
  { id: "nav-dashboard", title: "Dashboard", keywords: ["home", "overview", "tableau de bord"], vertical: "dashboard", path: "/dashboard" },
  { id: "nav-wallet", title: "Wallet", keywords: ["money", "balance", "portefeuille", "argent"], vertical: "wallet", path: "/wallet" },
  { id: "nav-wallet-forex", title: "Forex Exchange", keywords: ["currency", "exchange", "forex", "devises", "taux de change"], vertical: "wallet", path: "/wallet/forex" },
  { id: "nav-wallet-topup", title: "Wallet Top Up", keywords: ["recharge", "top up", "add money"], vertical: "wallet", path: "/wallet/top-up" },
  { id: "nav-wallet-transfer", title: "Send Money", keywords: ["transfer", "send", "envoi", "virement"], vertical: "wallet", path: "/wallet/transfer" },
  { id: "nav-radar", title: "Radar", keywords: ["map", "explore", "nearby", "carte", "autour de moi"], vertical: "radar", path: "/radar" },
  { id: "nav-orbit", title: "Orbit Messaging", keywords: ["chat", "messages", "orbit", "messagerie"], vertical: "orbit", path: "/orbit" },
  { id: "nav-prayer", title: "Prayer Times", keywords: ["prayer", "adhan", "mosque", "prière", "salat", "qibla"], vertical: "dashboard", path: "/dashboard/prayer-times" },
  { id: "nav-c2c", title: "C2C Marketplace", keywords: ["annonces", "classifieds", "buy", "sell", "vendre", "acheter"], vertical: "marketplace", path: "/marketplace/c2c" },
  { id: "nav-explorer", title: "Geographic Explorer", keywords: ["countries", "cities", "explorer", "pays", "villes", "geography"], vertical: "radar", path: "/explorer" },
  { id: "nav-settings", title: "Settings", keywords: ["settings", "preferences", "paramètres", "réglages"], vertical: "me", path: "/settings" },
  { id: "nav-profile", title: "My Profile", keywords: ["profile", "account", "profil", "compte"], vertical: "me", path: "/me" },
  { id: "nav-bookings", title: "My Bookings", keywords: ["reservations", "bookings", "réservations"], vertical: "dashboard", path: "/my-bookings" },
  { id: "nav-orders", title: "My Orders", keywords: ["orders", "commandes"], vertical: "dashboard", path: "/my-orders" },
  { id: "nav-favorites", title: "Favorites", keywords: ["favorites", "saved", "favoris"], vertical: "me", path: "/favorites" },
  { id: "nav-notifications", title: "Notifications", keywords: ["notifications", "alerts", "alertes"], vertical: "me", path: "/notifications" },
  { id: "nav-search", title: "Search", keywords: ["search", "find", "rechercher", "chercher"], vertical: "radar", path: "/search" },
  { id: "nav-boost", title: "Boost Listings", keywords: ["boost", "promote", "promouvoir"], vertical: "dashboard", path: "/boost" },
  { id: "nav-loyalty", title: "Loyalty Program", keywords: ["loyalty", "points", "fidélité", "rewards"], vertical: "me", path: "/loyalty" },
  { id: "nav-driver", title: "Driver Mode", keywords: ["driver", "chauffeur", "delivery", "livraison"], vertical: "driver", path: "/driver" },
  { id: "nav-merchant", title: "Merchant Dashboard", keywords: ["merchant", "commerçant", "shop", "boutique"], vertical: "merchant", path: "/merchant" },
  { id: "nav-travel-flights", title: "Flights", keywords: ["flights", "vols", "airline", "avion"], vertical: "travel", path: "/travel/flights" },
  { id: "nav-travel-stays", title: "Hotel & Stays", keywords: ["hotel", "stay", "hébergement", "hôtel"], vertical: "travel", path: "/travel/stays" },
  { id: "nav-support", title: "Support", keywords: ["help", "support", "aide", "assistance"], vertical: "me", path: "/support" },
];

function addNavigationEntities(entities: SearchableEntity[]) {
  for (const page of NAV_PAGES) {
    entities.push({
      entityId: page.id,
      entityType: "navigation",
      vertical: page.vertical,
      categoryKey: "navigation",
      subcategoryKey: page.path,
      title: page.title,
      keywords: page.keywords,
      rankScore: 90,
    });
  }
}

export function rebuildSearchIndex() {
  populateSearchIndex();
}
