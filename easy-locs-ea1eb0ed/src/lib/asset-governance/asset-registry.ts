/**
 * ASSET REGISTRY — Central catalog of all banner, hero, and video assets
 * ========================================================================
 * Every asset that can be used as a banner, hero, or video in the app MUST
 * be registered here with full governance fields. Unregistered assets are
 * treated as UNGOVERNED and blocked from publication.
 *
 * Mandatory fields: assetId, assetType, vertical, category, subcategory,
 * allowedKeywords, forbiddenKeywords, source, trustLevel, moderationStatus,
 * taxonomyScore, visualScore, finalScore, fallbackGroup, publishStatus
 */

import type {
  AssetType,
  AssetVertical,
  TrustLevel,
  ModerationStatus,
  PublishStatus,
} from "./asset-governance-taxonomy";

export interface RegistryAsset {
  assetId: string;
  assetType: AssetType;
  vertical: AssetVertical;
  category: string;
  subcategory: string | null;
  allowedKeywords: string[];
  forbiddenKeywords: string[];
  source: string;
  trustLevel: TrustLevel;
  moderationStatus: ModerationStatus;
  taxonomyScore: number;
  visualScore: number;
  finalScore: number;
  fallbackGroup: string;
  publishStatus: PublishStatus;
  url: string;
  altText?: string;
  title?: string;
  width?: number;
  height?: number;
  registeredAt: string;
  lastChecked?: string;
  rejectionReasons?: string[];
  quarantineReason?: string;
  repairRecord?: string;
}

export interface AssetRegistryStats {
  total: number;
  byVertical: Record<string, number>;
  byStatus: Record<PublishStatus, number>;
  byModeration: Record<ModerationStatus, number>;
  blocked: number;
  quarantined: number;
  published: number;
  fallback: number;
}

const _registry = new Map<string, RegistryAsset>();
const _quarantined = new Set<string>();
const _repairLog: Array<{ assetId: string; reason: string; repairedAt: string; rootCause: string }> = [];

function buildVerticalKeywords(vertical: AssetVertical): { allowed: string[]; forbidden: string[] } {
  const ALLOWED: Record<AssetVertical, string[]> = {
    food: ["food", "restaurant", "cafe", "meal", "dish", "cuisine", "dining", "kitchen"],
    grocery: ["grocery", "market", "supermarket", "fresh", "produce", "store"],
    healthcare: ["health", "medical", "clinic", "hospital", "doctor", "pharmacy", "care"],
    beauty: ["beauty", "salon", "spa", "hair", "nail", "makeup", "cosmetic", "skincare"],
    shops: ["shop", "store", "retail", "fashion", "clothing", "boutique", "electronics"],
    services: ["service", "repair", "cleaning", "handyman", "maintenance", "plumbing"],
    stay: ["hotel", "resort", "hostel", "stay", "accommodation", "room", "booking"],
    property: ["property", "apartment", "villa", "house", "real estate", "rent", "sale"],
    mobility: ["taxi", "car", "transport", "driver", "delivery", "ride", "courier"],
    experiences: ["tour", "activity", "experience", "adventure", "event", "attraction"],
    utility: ["atm", "fuel", "parking", "bank", "utility", "charging"],
    education: ["school", "university", "education", "learning", "course", "training"],
    finance: ["bank", "finance", "payment", "investment", "insurance", "exchange"],
  };
  const FORBIDDEN: Record<AssetVertical, string[]> = {
    food: ["pharmacy", "hospital", "clinic", "beach", "bikini", "taxi", "property"],
    grocery: ["pharmacy", "hospital", "beach", "hotel", "taxi", "real estate"],
    healthcare: ["beach", "bikini", "nightclub", "bar", "restaurant delivery", "beauty salon", "fashion"],
    beauty: ["pharmacy", "hospital", "surgery", "grocery", "taxi", "real estate"],
    shops: ["hospital surgery", "prescription medicine", "taxi dispatch"],
    services: ["hospital", "pharmacy", "beach resort", "restaurant dining"],
    stay: ["pharmacy", "hospital", "grocery delivery", "taxi dispatch"],
    property: ["pharmacy", "hospital", "restaurant delivery", "grocery", "beauty salon"],
    mobility: ["pharmacy", "hospital", "beauty salon", "restaurant dining"],
    experiences: ["pharmacy", "hospital", "grocery delivery"],
    utility: ["beach holiday", "restaurant dining", "beauty salon"],
    education: ["pharmacy", "hospital", "bar", "nightclub"],
    finance: ["pharmacy", "hospital", "beach holiday"],
  };
  return { allowed: ALLOWED[vertical] ?? [], forbidden: FORBIDDEN[vertical] ?? [] };
}

function buildFallbackGroup(vertical: AssetVertical): string {
  const map: Record<AssetVertical, string> = {
    food: "food",
    grocery: "grocery",
    healthcare: "service",
    beauty: "beauty",
    shops: "shops",
    services: "service",
    stay: "stay",
    property: "property",
    mobility: "mobility",
    experiences: "experiences",
    utility: "utility",
    education: "service",
    finance: "utility",
  };
  return map[vertical] ?? "service";
}

function buildStaticAssets(): RegistryAsset[] {
  const now = new Date().toISOString();

  const STATIC_LANDING_BANNERS: Array<{
    file: string;
    vertical: AssetVertical;
    category: string;
    subcategory: string | null;
    title: string;
    assetType: AssetType;
  }> = [
    { file: "food-banner.jpg", vertical: "food", category: "restaurant", subcategory: "restaurant", title: "Food Banner", assetType: "banner" },
    { file: "services-banner.jpg", vertical: "services", category: "services", subcategory: "cleaning", title: "Services Banner", assetType: "banner" },
    { file: "realestate-banner.jpg", vertical: "property", category: "property", subcategory: null, title: "Real Estate Banner", assetType: "banner" },
    { file: "transport-banner.jpg", vertical: "mobility", category: "mobility", subcategory: "taxi", title: "Transport Banner", assetType: "banner" },
    { file: "travel-banner.jpg", vertical: "experiences", category: "experiences", subcategory: null, title: "Travel Banner", assetType: "banner" },
  ];

  const STATIC_CATEGORY_ASSETS: Array<{
    file: string;
    vertical: AssetVertical;
    category: string;
    subcategory: string | null;
    title: string;
    assetType: AssetType;
  }> = [
    { file: "food.png", vertical: "food", category: "restaurant", subcategory: "restaurant", title: "Food Category", assetType: "category_cover" },
    { file: "grocery.png", vertical: "grocery", category: "grocery", subcategory: "supermarket", title: "Grocery Category", assetType: "category_cover" },
    { file: "healthcare.png", vertical: "healthcare", category: "clinic", subcategory: "clinic", title: "Healthcare Category", assetType: "category_cover" },
    { file: "beauty.png", vertical: "beauty", category: "beauty", subcategory: null, title: "Beauty Category", assetType: "category_cover" },
    { file: "shops.png", vertical: "shops", category: "shops", subcategory: "fashion", title: "Shops Category", assetType: "category_cover" },
    { file: "services.png", vertical: "services", category: "services", subcategory: "cleaning", title: "Services Category", assetType: "category_cover" },
    { file: "stays.png", vertical: "stay", category: "hotel", subcategory: "hotel", title: "Stays Category", assetType: "category_cover" },
    { file: "travel.png", vertical: "experiences", category: "experiences", subcategory: null, title: "Travel/Experiences Category", assetType: "category_cover" },
    { file: "taxi.png", vertical: "mobility", category: "mobility", subcategory: "taxi", title: "Taxi Category", assetType: "category_cover" },
    { file: "delivery.png", vertical: "mobility", category: "mobility", subcategory: "courier", title: "Delivery Category", assetType: "category_cover" },
    { file: "mobility.png", vertical: "mobility", category: "mobility", subcategory: null, title: "Mobility Category", assetType: "category_cover" },
    { file: "property.png", vertical: "property", category: "property", subcategory: null, title: "Property Category", assetType: "category_cover" },
    { file: "pharmacy.png", vertical: "healthcare", category: "clinic", subcategory: "pharmacy", title: "Pharmacy Category", assetType: "category_cover" },
    { file: "rentals.png", vertical: "property", category: "property", subcategory: null, title: "Rentals Category", assetType: "category_cover" },
    { file: "coffee.png", vertical: "food", category: "cafe", subcategory: "cafe", title: "Coffee Category", assetType: "category_cover" },
    { file: "bakery.png", vertical: "food", category: "cafe", subcategory: "bakery", title: "Bakery Category", assetType: "category_cover" },
    { file: "dineout.png", vertical: "food", category: "restaurant", subcategory: "fine_dining", title: "Dine Out Category", assetType: "category_cover" },
    { file: "electronics.png", vertical: "shops", category: "shops", subcategory: "electronics", title: "Electronics Category", assetType: "category_cover" },
    { file: "flowers.png", vertical: "shops", category: "shops", subcategory: "flowers", title: "Flowers Category", assetType: "category_cover" },
    { file: "gifts.png", vertical: "shops", category: "shops", subcategory: "gifts", title: "Gifts Category", assetType: "category_cover" },
    { file: "pets.png", vertical: "shops", category: "shops", subcategory: "pets", title: "Pets Category", assetType: "category_cover" },
    { file: "concierge.png", vertical: "services", category: "services", subcategory: null, title: "Concierge Services", assetType: "category_cover" },
    { file: "wallet.png", vertical: "finance", category: "finance", subcategory: null, title: "Wallet/Finance", assetType: "category_cover" },
  ];

  const PROMO_BANNERS: Array<{
    file: string;
    vertical: AssetVertical;
    category: string;
    subcategory: string | null;
    title: string;
    assetType: AssetType;
  }> = [
    { file: "promo-banner-1.png", vertical: "food", category: "restaurant", subcategory: null, title: "Promo Banner 1", assetType: "promo" },
    { file: "promo-banner-2.png", vertical: "food", category: "restaurant", subcategory: null, title: "Promo Banner 2", assetType: "promo" },
    { file: "super-app-services.png", vertical: "services", category: "services", subcategory: null, title: "Super App Services Promo", assetType: "promo" },
    { file: "ride-economy.png", vertical: "mobility", category: "mobility", subcategory: "taxi", title: "Ride Economy", assetType: "promo" },
    { file: "ride-comfort.png", vertical: "mobility", category: "mobility", subcategory: "chauffeur", title: "Ride Comfort", assetType: "promo" },
    { file: "ride-xl.png", vertical: "mobility", category: "mobility", subcategory: "taxi", title: "Ride XL", assetType: "promo" },
    { file: "ride-bike.png", vertical: "mobility", category: "mobility", subcategory: "bike", title: "Ride Bike", assetType: "promo" },
    { file: "ride-intercity.png", vertical: "mobility", category: "mobility", subcategory: "taxi", title: "Ride Intercity", assetType: "promo" },
    { file: "ride-schedule.png", vertical: "mobility", category: "mobility", subcategory: "taxi", title: "Ride Schedule", assetType: "promo" },
  ];

  const assets: RegistryAsset[] = [];

  for (const item of STATIC_LANDING_BANNERS) {
    const kw = buildVerticalKeywords(item.vertical);
    const asset: RegistryAsset = {
      assetId: `static:landing:${item.file}`,
      assetType: item.assetType,
      vertical: item.vertical,
      category: item.category,
      subcategory: item.subcategory,
      allowedKeywords: kw.allowed,
      forbiddenKeywords: kw.forbidden,
      source: "platform",
      trustLevel: "platform",
      moderationStatus: "approved",
      taxonomyScore: 90,
      visualScore: 80,
      finalScore: 85,
      fallbackGroup: buildFallbackGroup(item.vertical),
      publishStatus: "published",
      url: `/assets/landing/${item.file}`,
      title: item.title,
      altText: item.title,
      registeredAt: now,
    };
    assets.push(asset);
  }

  for (const item of STATIC_CATEGORY_ASSETS) {
    const kw = buildVerticalKeywords(item.vertical);
    const asset: RegistryAsset = {
      assetId: `static:category:${item.file}`,
      assetType: item.assetType,
      vertical: item.vertical,
      category: item.category,
      subcategory: item.subcategory,
      allowedKeywords: kw.allowed,
      forbiddenKeywords: kw.forbidden,
      source: "platform",
      trustLevel: "platform",
      moderationStatus: "approved",
      taxonomyScore: 90,
      visualScore: 80,
      finalScore: 85,
      fallbackGroup: buildFallbackGroup(item.vertical),
      publishStatus: "published",
      url: `/assets/categories/${item.file}`,
      title: item.title,
      altText: item.title,
      registeredAt: now,
    };
    assets.push(asset);
  }

  for (const item of PROMO_BANNERS) {
    const kw = buildVerticalKeywords(item.vertical);
    const asset: RegistryAsset = {
      assetId: `static:promo:${item.file}`,
      assetType: item.assetType,
      vertical: item.vertical,
      category: item.category,
      subcategory: item.subcategory,
      allowedKeywords: kw.allowed,
      forbiddenKeywords: kw.forbidden,
      source: "platform",
      trustLevel: "platform",
      moderationStatus: "approved",
      taxonomyScore: 88,
      visualScore: 82,
      finalScore: 85,
      fallbackGroup: buildFallbackGroup(item.vertical),
      publishStatus: "published",
      url: `/assets/${item.file}`,
      title: item.title,
      altText: item.title,
      registeredAt: now,
    };
    assets.push(asset);
  }

  return assets;
}

let _initialized = false;

function ensureInitialized(): void {
  if (_initialized) return;
  _initialized = true;
  const staticAssets = buildStaticAssets();
  for (const asset of staticAssets) {
    _registry.set(asset.assetId, asset);
  }
}

export function registerAsset(asset: RegistryAsset): void {
  ensureInitialized();
  _registry.set(asset.assetId, asset);
}

export function getAsset(assetId: string): RegistryAsset | undefined {
  ensureInitialized();
  return _registry.get(assetId);
}

export function isRegistered(assetId: string): boolean {
  ensureInitialized();
  return _registry.has(assetId);
}

export function isAssetQuarantined(assetId: string): boolean {
  return _quarantined.has(assetId);
}

export function quarantineAsset(assetId: string, reason: string): void {
  ensureInitialized();
  _quarantined.add(assetId);
  const asset = _registry.get(assetId);
  if (asset) {
    asset.moderationStatus = "quarantined";
    asset.publishStatus = "blocked";
    asset.quarantineReason = reason;
    asset.lastChecked = new Date().toISOString();
    _registry.set(assetId, asset);
  }
}

export function unquarantineAsset(assetId: string): void {
  _quarantined.delete(assetId);
  const asset = _registry.get(assetId);
  if (asset) {
    asset.moderationStatus = "pending";
    asset.publishStatus = "draft";
    asset.quarantineReason = undefined;
    asset.lastChecked = new Date().toISOString();
    _registry.set(assetId, asset);
  }
}

export function recordRepair(assetId: string, rootCause: string, reason: string): void {
  _repairLog.push({
    assetId,
    reason,
    repairedAt: new Date().toISOString(),
    rootCause,
  });
  const asset = _registry.get(assetId);
  if (asset) {
    asset.repairRecord = `${rootCause}: ${reason}`;
    asset.lastChecked = new Date().toISOString();
    _registry.set(assetId, asset);
  }
}

export function updateAssetStatus(
  assetId: string,
  updates: Partial<Pick<RegistryAsset, "publishStatus" | "moderationStatus" | "taxonomyScore" | "visualScore" | "finalScore" | "rejectionReasons">>
): void {
  ensureInitialized();
  const asset = _registry.get(assetId);
  if (asset) {
    Object.assign(asset, updates, { lastChecked: new Date().toISOString() });
    _registry.set(assetId, asset);
  }
}

export function getAllAssets(): RegistryAsset[] {
  ensureInitialized();
  return [..._registry.values()];
}

export function getAssetsForVertical(vertical: string): RegistryAsset[] {
  ensureInitialized();
  return [..._registry.values()].filter((a) => a.vertical === vertical);
}

export function getPublishedAssetsForVertical(vertical: string): RegistryAsset[] {
  ensureInitialized();
  return [..._registry.values()].filter(
    (a) => a.vertical === vertical && a.publishStatus === "published" && a.moderationStatus === "approved"
  );
}

export function getBlockedAssets(): RegistryAsset[] {
  ensureInitialized();
  return [..._registry.values()].filter((a) => a.publishStatus === "blocked");
}

export function getQuarantinedAssets(): RegistryAsset[] {
  ensureInitialized();
  return [..._registry.values()].filter((a) => a.moderationStatus === "quarantined");
}

export function getFallbackAsset(vertical: string): RegistryAsset | undefined {
  ensureInitialized();
  return [..._registry.values()].find(
    (a) => a.vertical === vertical && a.publishStatus === "fallback" && a.moderationStatus === "approved"
  );
}

export function getRepairLog(): typeof _repairLog {
  return [..._repairLog];
}

export function getRegistryStats(): AssetRegistryStats {
  ensureInitialized();
  const all = [..._registry.values()];
  const byVertical: Record<string, number> = {};
  const byStatus: Record<PublishStatus, number> = { published: 0, draft: 0, blocked: 0, fallback: 0 };
  const byModeration: Record<ModerationStatus, number> = { approved: 0, pending: 0, rejected: 0, quarantined: 0 };

  for (const a of all) {
    byVertical[a.vertical] = (byVertical[a.vertical] ?? 0) + 1;
    byStatus[a.publishStatus] = (byStatus[a.publishStatus] ?? 0) + 1;
    byModeration[a.moderationStatus] = (byModeration[a.moderationStatus] ?? 0) + 1;
  }

  return {
    total: all.length,
    byVertical,
    byStatus,
    byModeration,
    blocked: byStatus.blocked,
    quarantined: byModeration.quarantined,
    published: byStatus.published,
    fallback: byStatus.fallback,
  };
}

ensureInitialized();
