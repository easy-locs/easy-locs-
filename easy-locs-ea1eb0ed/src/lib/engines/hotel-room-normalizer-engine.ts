/**
 * Hotel Room Normalizer Engine — Validates and normalizes hotel/stay listings.
 *
 * Normalizes (writes back to DB):
 * - Room types: mapped to canonical taxonomy and persisted
 * - Amenities: validated against canonical list, unknown ones mapped to closest or removed
 * - Pricing: format normalized (price_per_night enforced, currency validated)
 * - Images: placeholder images stripped, image count validated
 *
 * Also reports issues for non-auto-fixable problems.
 */
import { db } from "@/services/db";

export const CANONICAL_ROOM_TYPES = [
  "standard", "deluxe", "suite", "junior_suite", "executive_suite",
  "presidential_suite", "studio", "apartment", "villa", "bungalow",
  "connecting", "accessible", "family", "single", "double", "twin",
  "triple", "penthouse", "cabin", "pod",
] as const;

export type CanonicalRoomType = typeof CANONICAL_ROOM_TYPES[number];

export const CANONICAL_AMENITIES = new Set([
  "wifi", "air_conditioning", "heating", "tv", "minibar", "safe",
  "bathtub", "shower", "hairdryer", "balcony", "terrace", "pool_access",
  "gym_access", "spa_access", "parking", "breakfast_included", "kitchen",
  "kitchenette", "washing_machine", "dryer", "dishwasher", "coffee_machine",
  "iron", "desk", "sofa", "blackout_curtains", "soundproofing", "sea_view",
  "city_view", "garden_view", "mountain_view", "non_smoking", "smoking",
  "pet_friendly", "wheelchair_accessible", "24h_reception", "concierge",
  "room_service", "laundry", "luggage_storage",
]);

// Amenity aliases: normalize alternate spellings/formats to canonical keys
const AMENITY_ALIASES: Record<string, string> = {
  "wi-fi": "wifi", "wi fi": "wifi", "internet": "wifi", "free wifi": "wifi",
  "ac": "air_conditioning", "a/c": "air_conditioning", "air con": "air_conditioning",
  "air conditioner": "air_conditioning", "aircondition": "air_conditioning",
  "television": "tv", "flat screen tv": "tv", "satellite tv": "tv",
  "mini bar": "minibar", "mini-bar": "minibar",
  "hair dryer": "hairdryer", "hair-dryer": "hairdryer", "blow dryer": "hairdryer",
  "private pool": "pool_access", "swimming pool": "pool_access",
  "fitness": "gym_access", "fitness center": "gym_access", "gym": "gym_access",
  "spa": "spa_access", "wellness": "spa_access",
  "free parking": "parking", "car park": "parking", "valet": "parking",
  "breakfast": "breakfast_included", "complimentary breakfast": "breakfast_included",
  "kitchenette": "kitchenette", "full kitchen": "kitchen",
  "washing machine": "washing_machine", "washer": "washing_machine",
  "ocean view": "sea_view", "lake view": "sea_view",
  "non smoking": "non_smoking", "no smoking": "non_smoking",
  "pets allowed": "pet_friendly", "dog friendly": "pet_friendly",
  "wheelchair": "wheelchair_accessible", "accessible": "wheelchair_accessible",
  "24 hour reception": "24h_reception", "24/7 reception": "24h_reception",
};

const ROOM_TYPE_ALIASES: Record<string, CanonicalRoomType> = {
  "standard room": "standard",
  "deluxe room": "deluxe",
  "suite room": "suite",
  "junior suite": "junior_suite",
  "exec suite": "executive_suite",
  "executive": "executive_suite",
  "presidential": "presidential_suite",
  "presidential room": "presidential_suite",
  "studio apartment": "studio",
  "studio room": "studio",
  "flat": "apartment",
  "bungalow room": "bungalow",
  "family room": "family",
  "single room": "single",
  "double room": "double",
  "twin room": "twin",
  "twin beds": "twin",
  "triple room": "triple",
  "penthouse suite": "penthouse",
  "penthouse room": "penthouse",
  "accessible room": "accessible",
  "wheelchair accessible": "accessible",
  "connecting rooms": "connecting",
  "pod room": "pod",
  "sleep pod": "pod",
};

const PLACEHOLDER_IMAGE_PATTERNS = [
  "placeholder", "dummyimage", "placehold.co", "via.placeholder",
  "picsum.photos", "lorempixel", "unsplash.com", "fakeimg",
];

const ALLOWED_CURRENCIES = new Set([
  "USD", "EUR", "GBP", "AED", "SAR", "NGN", "KES", "ZAR", "GHS",
  "XOF", "EGP", "MAD", "TZS", "UGX", "ETB", "MXN", "BRL", "INR",
  "CAD", "AUD", "JPY", "CNY", "CHF", "SGD", "THB", "MYR", "IDR",
]);

export interface RoomNormalizationIssue {
  shopId: string;
  shopName: string;
  roomIndex: number;
  issue: string;
  suggestedFix: string;
  autoFixed?: boolean;
}

export interface HotelNormalizationResult {
  status: "completed";
  results: RoomNormalizationIssue[];
  normalized: number;
  hotelsScanned: number;
  persisted: number;
}

function normalizeRoomType(raw: string): CanonicalRoomType | null {
  const lower = raw.trim().toLowerCase();
  if (CANONICAL_ROOM_TYPES.includes(lower as CanonicalRoomType)) {
    return lower as CanonicalRoomType;
  }
  const alias = ROOM_TYPE_ALIASES[lower];
  return alias ?? null;
}

function normalizeAmenityKey(raw: string): string | null {
  const key = raw.trim().toLowerCase().replace(/[\s-]/g, "_");
  if (CANONICAL_AMENITIES.has(key)) return key;
  const aliasInput = raw.trim().toLowerCase();
  const alias = AMENITY_ALIASES[aliasInput] ?? AMENITY_ALIASES[key.replace(/_/g, " ")];
  return alias ?? null;
}

function stripPlaceholderImages(images: unknown[]): { cleaned: unknown[]; removed: number } {
  let removed = 0;
  const cleaned = images.filter(img => {
    const imgObj = img as Record<string, unknown> | string | null;
    const url = String(typeof imgObj === "string" ? imgObj : ((imgObj as Record<string, unknown>)?.url ?? "")).toLowerCase();
    if (!url.startsWith("http")) return false;
    if (PLACEHOLDER_IMAGE_PATTERNS.some(p => url.includes(p))) {
      removed++;
      return false;
    }
    return true;
  });
  return { cleaned, removed };
}

function normalizeRoomEntry(room: Record<string, unknown>): {
  normalized: Record<string, unknown>;
  issues: Array<{ issue: string; suggestedFix: string; autoFixed: boolean }>;
} {
  const issues: Array<{ issue: string; suggestedFix: string; autoFixed: boolean }> = [];
  const out: Record<string, unknown> = { ...room };

  // ── Normalize room type ──
  const rawType = String(room.type ?? room.room_type ?? "").trim();
  if (!rawType) {
    issues.push({ issue: "missing_room_type", suggestedFix: `Set type to one of: ${CANONICAL_ROOM_TYPES.slice(0, 5).join(", ")}...`, autoFixed: false });
  } else {
    const canonical = normalizeRoomType(rawType);
    if (canonical) {
      out.type = canonical;
      out.room_type = canonical;
      if (canonical !== rawType.toLowerCase()) {
        issues.push({ issue: `room_type_normalized:${rawType}→${canonical}`, suggestedFix: canonical, autoFixed: true });
      }
    } else {
      issues.push({ issue: `unknown_room_type:${rawType}`, suggestedFix: `Use a canonical room type: ${CANONICAL_ROOM_TYPES.slice(0, 5).join(", ")}...`, autoFixed: false });
    }
  }

  // ── Normalize amenities ──
  const amenities = Array.isArray(room.amenities) ? room.amenities : [];
  if (amenities.length === 0) {
    issues.push({ issue: "no_amenities_listed", suggestedFix: "Add amenities like wifi, air_conditioning, tv", autoFixed: false });
  } else {
    const normalized: string[] = [];
    let hadChanges = false;
    for (const a of amenities) {
      const key = normalizeAmenityKey(String(a));
      if (key) {
        normalized.push(key);
        if (key !== String(a).toLowerCase()) hadChanges = true;
      } else {
        // Drop unknown amenities (can't be auto-fixed)
        issues.push({ issue: `unknown_amenity_dropped:${String(a)}`, suggestedFix: "Use canonical amenity keys", autoFixed: true });
        hadChanges = true;
      }
    }
    out.amenities = normalized;
    if (hadChanges) {
      issues.push({ issue: "amenities_normalized", suggestedFix: "Amenities mapped to canonical keys", autoFixed: true });
    }
  }

  // ── Normalize pricing ──
  const priceRaw = room.price_per_night ?? room.price;
  if (priceRaw == null) {
    issues.push({ issue: "missing_price_per_night", suggestedFix: "Set a price_per_night value", autoFixed: false });
  } else {
    const price = Number(priceRaw);
    if (isNaN(price) || price <= 0) {
      issues.push({ issue: "invalid_price_per_night", suggestedFix: "Set a valid numeric price > 0", autoFixed: false });
    } else {
      out.price_per_night = price;
      if (room.price_per_night == null) {
        out.price_per_night = price;
        issues.push({ issue: "price_field_normalized:price→price_per_night", suggestedFix: String(price), autoFixed: true });
      }
      if (price < 5) issues.push({ issue: "suspiciously_low_price", suggestedFix: "Verify price is correct", autoFixed: false });
      if (price > 100_000) issues.push({ issue: "suspiciously_high_price", suggestedFix: "Verify price is correct", autoFixed: false });
    }
  }

  // ── Validate and normalize currency ──
  const rawCurrency = String(room.currency ?? "").trim().toUpperCase();
  if (!rawCurrency) {
    issues.push({ issue: "missing_currency", suggestedFix: "Set a currency field (e.g. USD, EUR, GBP)", autoFixed: false });
  } else if (!ALLOWED_CURRENCIES.has(rawCurrency)) {
    const examples = [...ALLOWED_CURRENCIES].slice(0, 5).join(", ");
    issues.push({ issue: `invalid_currency_code:${rawCurrency}`, suggestedFix: `Use a supported ISO 4217 code: ${examples}...`, autoFixed: false });
  } else {
    out.currency = rawCurrency;
  }

  // ── Normalize images: strip placeholders ──
  const images = Array.isArray(room.images) ? room.images : [];
  if (images.length === 0) {
    issues.push({ issue: "missing_room_images", suggestedFix: "Add at least one real room photo URL", autoFixed: false });
  } else {
    const { cleaned, removed } = stripPlaceholderImages(images);
    if (removed > 0) {
      out.images = cleaned;
      issues.push({ issue: `placeholder_images_stripped:${removed}`, suggestedFix: "Placeholder images removed", autoFixed: true });
    }
    if (cleaned.length === 0) {
      issues.push({ issue: "no_real_room_images_after_cleanup", suggestedFix: "Add real room photo URLs", autoFixed: false });
    }
  }

  // ── Validate capacity ──
  const cap = room.capacity ?? room.max_guests;
  if (cap == null || Number(cap) <= 0) {
    issues.push({ issue: "missing_room_capacity", suggestedFix: "Set capacity (max_guests) to a positive number", autoFixed: false });
  } else {
    out.capacity = Number(cap);
    out.max_guests = Number(cap);
  }

  return { normalized: out, issues };
}

export async function runHotelRoomNormalizer(
  batchSize = 100,
  countryCodes?: string[]
): Promise<HotelNormalizationResult> {
  // Restrict to records that have not yet been validated by the hotel publish gate
  // or advanced to a terminal stage. This avoids repeated rescans of already-processed
  // hotels and keeps normalization focused on new/unvalidated candidates.
  const TERMINAL_STAGES = [
    "validated", "moderation_passed", "published",
    "blocked_quality_gate", "auto_unpublished_stale",
    "moderation_blocked", "moderation_flagged",
  ].join(",");

  let query = db
    .from("seed_merchants")
    .select("id, name, rooms_json, vertical")
    .in("vertical", ["hotel", "stay"])
    .or(`pipeline_stage.is.null,pipeline_stage.not.in.(${TERMINAL_STAGES})`)
    .limit(batchSize);

  if (countryCodes && countryCodes.length > 0) {
    query = query.in("country", countryCodes);
  }

  const { data: merchants } = await query;

  if (!merchants || merchants.length === 0) {
    return { status: "completed", results: [], normalized: 0, hotelsScanned: 0, persisted: 0 };
  }

  const allIssues: RoomNormalizationIssue[] = [];
  let normalized = 0;
  let persisted = 0;
  const now = new Date().toISOString();

  for (const m of merchants) {
    const merchant = m as Record<string, unknown>;
    const rooms = Array.isArray(merchant.rooms_json) ? (merchant.rooms_json as Record<string, unknown>[]) : [];
    const shopId = String(merchant.id ?? m.id);
    const shopName = String(merchant.name ?? "");

    if (rooms.length === 0) {
      allIssues.push({
        shopId,
        shopName,
        roomIndex: -1,
        issue: "no_rooms_defined",
        suggestedFix: "Add at least one room type with pricing",
        autoFixed: false,
      });
      normalized++;
      continue;
    }

    const normalizedRooms: Record<string, unknown>[] = [];
    let hadChanges = false;

    for (let i = 0; i < rooms.length; i++) {
      const { normalized: normRoom, issues } = normalizeRoomEntry(rooms[i]);
      normalizedRooms.push(normRoom);

      for (const issue of issues) {
        if (issue.autoFixed) hadChanges = true;
        allIssues.push({
          shopId,
          shopName,
          roomIndex: i,
          ...issue,
        });
        normalized++;
      }
    }

    // Persist normalized rooms_json back to DB if anything was auto-fixed.
    // Only increment persisted on successful write to keep metrics accurate.
    if (hadChanges) {
      const { error: persistErr } = await db("seed_merchants")
        .update({ rooms_json: normalizedRooms, updated_at: now })
        .eq("id", m.id);
      if (persistErr) {
        console.warn(`[hotel-room-normalizer] rooms_json persist failed for ${shopId}:`, persistErr.message);
      } else {
        persisted++;
      }
    }
  }

  console.log(`[hotel-room-normalizer] Scanned ${merchants.length} hotels, ${normalized} issues, ${persisted} persisted`);

  return {
    status: "completed",
    results: allIssues,
    normalized,
    hotelsScanned: merchants.length,
    persisted,
  };
}
