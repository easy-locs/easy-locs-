import {
  getAllowedMediaKinds,
  isMediaKindAllowed,
  getDefaultMediaKinds,
  isValidVertical,
  type CanonicalVertical,
  type MediaKind,
} from "@/lib/taxonomy/canonical-registry";
import type {
  MediaAsset,
  MediaAnalysisResult,
  MediaLifecycleStatus,
  QuarantineReason,
} from "@/domains/content-pipeline/types";

export const MEDIA_VALIDATOR_VERSION = "1.0.0";

export interface MediaTruthResult {
  mediaAssetId: string;
  valid: boolean;
  detectedMediaKind: MediaKind | null;
  entityMatchConfidence: number;
  verticalMatchConfidence: number;
  qualityScore: number;
  isStock: boolean;
  hasWatermark: boolean;
  isDuplicate: boolean;
  eligibleAsPrimary: boolean;
  rejectionReasons: string[];
  suggestedStatus: MediaLifecycleStatus;
  quarantineReasons: QuarantineReason[];
}

export interface PrimaryMediaSelection {
  selectedAssetId: string | null;
  candidates: Array<{
    assetId: string;
    mediaKind: MediaKind | null;
    score: number;
    eligible: boolean;
    reason: string;
  }>;
}

const STOCK_PATTERNS = /shutterstock|istock|getty|unsplash|placeholder|dummy|lorem|picsum|pexels\.com\/photo|stock\.adobe|depositphotos|123rf|freepik|rawpixel/i;
const WATERMARK_PATTERNS = /watermark|sample|preview|draft|demo|proof|trial/i;

const MEDIA_KIND_KEYWORDS: Record<MediaKind, string[]> = {
  exterior: ["exterior", "outside", "facade", "front", "entrance", "building"],
  interior: ["interior", "inside", "indoor", "hall", "dining"],
  dish: ["dish", "food", "meal", "plate", "cuisine", "menu item"],
  menu: ["menu", "price list", "carte"],
  logo: ["logo", "brand", "icon", "emblem"],
  facade: ["facade", "front", "entrance", "exterior"],
  lobby: ["lobby", "foyer", "reception area", "entrance hall"],
  room: ["room", "bedroom", "suite", "accommodation", "guest room"],
  bathroom: ["bathroom", "toilet", "shower", "bath"],
  pool: ["pool", "swimming", "jacuzzi"],
  amenities: ["amenity", "facility", "spa", "gym area", "garden"],
  building: ["building", "structure", "complex"],
  reception: ["reception", "front desk", "counter", "waiting area"],
  treatment_room: ["treatment", "procedure", "examination", "consulting"],
  equipment: ["equipment", "machine", "device", "instrument"],
  entrance: ["entrance", "door", "gate", "entry"],
  gym_floor: ["gym floor", "training area", "workout area", "weight room"],
  machines: ["machine", "treadmill", "weights", "dumbbell", "equipment"],
  studio: ["studio", "class room", "group fitness"],
  locker: ["locker", "changing room", "shower"],
  product: ["product", "item", "merchandise"],
  storefront: ["storefront", "shop front", "window"],
  window_display: ["window display", "showcase"],
  vehicle: ["vehicle", "car", "truck", "van"],
  driver_portrait: ["driver", "portrait", "headshot"],
  fuel_station: ["fuel", "gas", "pump", "petrol"],
  atm_machine: ["atm", "cash machine"],
  pharmacy_front: ["pharmacy", "drugstore"],
  parking_lot: ["parking", "garage", "car park"],
  event_venue: ["venue", "stage", "arena"],
  activity: ["activity", "sport", "adventure"],
  landscape: ["landscape", "scenery", "view"],
  listing_hero: ["listing", "property", "hero"],
  floor_plan: ["floor plan", "layout", "blueprint"],
  neighborhood: ["neighborhood", "area", "district", "surroundings"],
  cover: ["cover", "banner", "header"],
  gallery: ["gallery", "collection"],
  generic: ["image", "photo"],
};

const VERTICAL_SIGNAL_KEYWORDS: Record<string, string[]> = {
  food: ["restaurant", "cafe", "bistro", "diner", "food court", "eatery", "dish", "meal", "cuisine", "menu", "kitchen", "chef", "cook", "dining"],
  grocery: ["grocery", "supermarket", "mart", "market", "convenience store", "produce", "fresh fruit", "vegetable", "dairy", "butcher", "organic store"],
  shops: ["shop", "store", "boutique", "retail", "outlet", "mall", "fashion", "clothing", "electronics", "jewelry", "brand"],
  services: ["repair", "plumber", "electrician", "mechanic", "laundry", "cleaning", "handyman", "maintenance", "pest control", "movers"],
  healthcare: ["clinic", "hospital", "pharmacy", "doctor", "medical", "dental", "lab", "health center", "prescription", "treatment", "nurse"],
  health: ["clinic", "hospital", "pharmacy", "doctor", "medical", "dental", "lab"],
  fitness: ["gym", "fitness", "yoga", "crossfit", "pilates", "workout", "training"],
  property: ["apartment", "house", "condo", "real estate", "rental", "flat", "villa", "penthouse", "sqft", "bedroom", "listing"],
  stay: ["hotel", "hostel", "resort", "motel", "lodge", "airbnb", "guesthouse", "accommodation", "suite", "check-in", "booking"],
  mobility: ["taxi", "ride", "uber", "lyft", "car rental", "scooter", "bike", "driver", "chauffeur", "courier", "transport"],
  utility: ["atm", "parking", "fuel", "gas station", "ev charging", "post office", "bank", "charging station"],
  beauty: ["salon", "spa", "barber", "nails", "skincare", "massage", "beauty", "makeup", "hair", "nail art", "cosmetic", "grooming"],
  experiences: ["tour", "museum", "concert", "event", "theater", "adventure", "excursion", "activity", "safari", "diving", "hiking"],
};

export const STRICT_CROSS_VERTICAL_RULES: Record<string, { forbidden: string[]; description: string }> = {
  healthcare: {
    forbidden: ["beach", "bikini", "swimsuit", "nightclub", "bar", "fashion", "beauty salon", "nail", "makeup artist", "tattoo", "restaurant delivery", "resort", "holiday"],
    description: "Healthcare must never show beach/beauty/fashion/travel/entertainment imagery",
  },
  food: {
    forbidden: ["pharmacy", "medicine", "hospital", "surgery", "prescription", "clinic", "beach resort", "bikini", "real estate"],
    description: "Food must never show pharmacy/medical/beach-resort/real-estate imagery",
  },
  grocery: {
    forbidden: ["beach", "ocean", "bikini", "holiday", "travel", "resort", "hotel", "pharmacy", "medicine", "hospital", "surgery", "beauty salon"],
    description: "Grocery must never show beach/travel/medical/beauty imagery",
  },
  beauty: {
    forbidden: ["pharmacy", "medicine", "hospital", "surgery", "prescription", "medical treatment", "grocery delivery", "food delivery"],
    description: "Beauty must never show medical/pharmaceutical/grocery imagery",
  },
  mobility: {
    forbidden: ["pharmacy", "hospital", "surgery", "beauty salon", "spa treatment"],
    description: "Mobility must never show medical/beauty imagery",
  },
  stay: {
    forbidden: ["pharmacy", "hospital", "clinic", "medicine", "prescription", "grocery delivery"],
    description: "Stay must never show medical/pharmacy/grocery imagery",
  },
};

export function detectCrossVerticalContamination(
  url: string,
  declaredVertical: CanonicalVertical,
  detectedKind: MediaKind | null,
): { contaminated: boolean; suspectedVertical: string | null } {
  const searchText = url.toLowerCase();
  let bestOtherVertical: string | null = null;
  let bestOtherScore = 0;
  let declaredScore = 0;

  for (const [vertical, keywords] of Object.entries(VERTICAL_SIGNAL_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (searchText.includes(kw)) score++;
    }
    if (vertical === declaredVertical) {
      declaredScore = score;
    } else if (score > bestOtherScore) {
      bestOtherScore = score;
      bestOtherVertical = vertical;
    }
  }

  if (bestOtherScore >= 2 && bestOtherScore > declaredScore && declaredScore === 0) {
    return { contaminated: true, suspectedVertical: bestOtherVertical };
  }

  return { contaminated: false, suspectedVertical: null };
}

export function classifyMediaKind(
  url: string,
  entityName: string,
  vertical: CanonicalVertical,
  existingLabels?: string[],
): MediaKind | null {
  const searchText = [url, entityName, ...(existingLabels || [])].join(" ").toLowerCase();

  const allowedKinds = getDefaultMediaKinds(vertical);
  let bestMatch: MediaKind | null = null;
  let bestScore = 0;

  for (const kind of allowedKinds) {
    const keywords = MEDIA_KIND_KEYWORDS[kind] || [];
    let score = 0;
    for (const kw of keywords) {
      if (searchText.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = kind;
    }
  }

  return bestMatch;
}

export function validateMediaForEntity(
  media: {
    url: string;
    width?: number;
    height?: number;
    sizeBytes?: number;
    format?: string;
  },
  entityName: string,
  vertical: CanonicalVertical,
  canonicalType: string,
): MediaTruthResult {
  const rejectionReasons: string[] = [];
  const quarantineReasons: QuarantineReason[] = [];
  let qualityScore = 100;
  let entityMatchConfidence = 0.5;
  let verticalMatchConfidence = 0.5;

  const isStock = STOCK_PATTERNS.test(media.url);
  const hasWatermark = WATERMARK_PATTERNS.test(media.url);

  if (isStock) {
    rejectionReasons.push("Stock image detected");
    qualityScore -= 30;
  }

  if (hasWatermark) {
    rejectionReasons.push("Watermark detected");
    qualityScore -= 25;
  }

  if (!media.url || media.url.trim() === "") {
    rejectionReasons.push("Empty image URL");
    qualityScore = 0;
  }

  if (media.width != null && media.width < 200) {
    rejectionReasons.push(`Width ${media.width}px below 200px minimum`);
    qualityScore -= 20;
  }
  if (media.height != null && media.height < 200) {
    rejectionReasons.push(`Height ${media.height}px below 200px minimum`);
    qualityScore -= 20;
  }

  if (media.sizeBytes != null && media.sizeBytes > 10 * 1024 * 1024) {
    rejectionReasons.push("File size exceeds 10MB");
    qualityScore -= 10;
  }

  const allowedFormats = new Set(["jpg", "jpeg", "png", "webp", "avif"]);
  if (media.format && !allowedFormats.has(media.format.toLowerCase())) {
    rejectionReasons.push(`Format "${media.format}" not allowed`);
    qualityScore -= 30;
  }

  const detectedKind = classifyMediaKind(media.url, entityName, vertical);
  const allowedKinds = getAllowedMediaKinds(canonicalType);

  if (detectedKind && allowedKinds.length > 0) {
    if (isMediaKindAllowed(canonicalType, detectedKind)) {
      verticalMatchConfidence = 0.9;
      entityMatchConfidence = 0.8;
    } else {
      rejectionReasons.push(`Media kind "${detectedKind}" not allowed for type "${canonicalType}"`);
      quarantineReasons.push("media_mismatch");
      qualityScore -= 25;
      verticalMatchConfidence = 0.3;
      entityMatchConfidence = 0.3;
    }
  }

  const crossVerticalResult = detectCrossVerticalContamination(media.url, vertical, detectedKind);
  if (crossVerticalResult.contaminated) {
    rejectionReasons.push(`Cross-vertical contamination: media belongs to "${crossVerticalResult.suspectedVertical}" not "${vertical}"`);
    quarantineReasons.push("cross_vertical_contamination");
    qualityScore -= 40;
    verticalMatchConfidence = 0.1;
    entityMatchConfidence = 0.1;
  }

  qualityScore = Math.max(0, Math.min(100, qualityScore));

  const hasCriticalIssue = qualityScore < 30 || rejectionReasons.length > 2;
  const eligibleAsPrimary = !isStock && !hasWatermark && qualityScore >= 50 && verticalMatchConfidence >= 0.5;

  let suggestedStatus: MediaLifecycleStatus = "candidate";
  if (hasCriticalIssue) {
    suggestedStatus = "rejected";
  } else if (quarantineReasons.length > 0) {
    suggestedStatus = "quarantined";
  } else if (qualityScore >= 70 && verticalMatchConfidence >= 0.7) {
    suggestedStatus = "approved";
  }

  return {
    mediaAssetId: "",
    valid: !hasCriticalIssue,
    detectedMediaKind: detectedKind,
    entityMatchConfidence,
    verticalMatchConfidence,
    qualityScore,
    isStock,
    hasWatermark,
    isDuplicate: false,
    eligibleAsPrimary,
    rejectionReasons,
    suggestedStatus,
    quarantineReasons,
  };
}

export function selectPrimaryMedia(
  assets: Array<{
    id: string;
    url: string;
    mediaKind: MediaKind | null;
    qualityScore: number;
    verificationStatus: MediaLifecycleStatus;
    isStock: boolean;
    hasWatermark: boolean;
  }>,
  canonicalType: string,
): PrimaryMediaSelection {
  const allowedKinds = new Set(getAllowedMediaKinds(canonicalType));

  const candidates = assets.map(asset => {
    let score = asset.qualityScore;
    let eligible = true;
    let reason = "eligible";

    if (asset.verificationStatus === "rejected" || asset.verificationStatus === "quarantined") {
      eligible = false;
      reason = `Status is ${asset.verificationStatus}`;
      score = 0;
    }

    if (asset.isStock) {
      eligible = false;
      reason = "Stock image cannot be primary";
      score *= 0.3;
    }

    if (asset.hasWatermark) {
      eligible = false;
      reason = "Watermarked image cannot be primary";
      score *= 0.3;
    }

    if (asset.mediaKind && allowedKinds.size > 0 && !allowedKinds.has(asset.mediaKind)) {
      eligible = false;
      reason = `Media kind "${asset.mediaKind}" not allowed for type "${canonicalType}"`;
      score *= 0.5;
    }

    if (asset.mediaKind === "exterior" || asset.mediaKind === "facade" || asset.mediaKind === "listing_hero") {
      score *= 1.2;
    }

    if (asset.verificationStatus === "approved") {
      score *= 1.3;
    }

    return {
      assetId: asset.id,
      mediaKind: asset.mediaKind,
      score: Math.min(100, score),
      eligible,
      reason,
    };
  });

  candidates.sort((a, b) => {
    if (a.eligible && !b.eligible) return -1;
    if (!a.eligible && b.eligible) return 1;
    return b.score - a.score;
  });

  const selected = candidates.find(c => c.eligible) ?? null;

  return {
    selectedAssetId: selected?.assetId ?? null,
    candidates,
  };
}

export function validateMediaBatch(
  mediaItems: Array<{
    id: string;
    url: string;
    width?: number;
    height?: number;
    sizeBytes?: number;
    format?: string;
  }>,
  entityName: string,
  vertical: CanonicalVertical,
  canonicalType: string,
): MediaTruthResult[] {
  const fingerprints = new Map<string, string>();
  const results: MediaTruthResult[] = [];

  for (const item of mediaItems) {
    const result = validateMediaForEntity(item, entityName, vertical, canonicalType);
    result.mediaAssetId = item.id;

    const cleanUrl = item.url.split(/[?#]/)[0].toLowerCase().replace(/https?:\/\//, "").replace(/\/$/, "");
    if (fingerprints.has(cleanUrl)) {
      result.isDuplicate = true;
      result.rejectionReasons.push(`Duplicate of media ${fingerprints.get(cleanUrl)}`);
      result.qualityScore = Math.max(0, result.qualityScore - 15);
    } else {
      fingerprints.set(cleanUrl, item.id);
    }

    results.push(result);
  }

  return results;
}
