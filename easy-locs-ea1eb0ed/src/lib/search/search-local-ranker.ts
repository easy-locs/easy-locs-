/**
 * Search Local Ranker — Local-first ranking with bucket system.
 * 
 * This is the ONLY ranking truth. No UI may re-sort after this.
 *
 * Buckets: same_zone → same_district → same_city → same_country → international
 * 
 * MODES:
 *   STRICT_ADDRESS: zone/district/proximity dominate; text last; foreign crushed
 *   PLACE_DISCOVERY: balanced (default)
 *
 * Weights (place_discovery):
 *   0.30 proximity + 0.20 country_city + 0.15 district_zone
 * + 0.15 text + 0.10 popularity + 0.05 category + 0.05 serviceability
 *
 * Weights (strict_address):
 *   0.35 proximity + 0.25 country_city + 0.20 district_zone
 * + 0.05 text + 0.05 popularity + 0.05 category + 0.05 serviceability
 *
 * COUNTRY COMPARISON:
 *   Uses country_code (ISO 2-letter) as primary key, NOT country_name.
 */
import { haversineKm } from "@/lib/geo/distance";
import type { SearchCandidate } from "./search-provider-normalizer";
import type { SearchIntent } from "./search-intent-resolver";
import { resolveSearchMode, strictPlaceTypePenalty } from "./search-mode-resolver";

// ── Weight sets per mode ──
const WEIGHTS = {
  place_discovery: { proximity: 0.30, country_city: 0.20, district_zone: 0.15, text: 0.15, popularity: 0.10, category: 0.05, serviceability: 0.05 },
  strict_address:  { proximity: 0.35, country_city: 0.25, district_zone: 0.20, text: 0.05, popularity: 0.05, category: 0.05, serviceability: 0.05 },
} as const;

interface RankingContext {
  query: string;
  userLat?: number;
  userLng?: number;
  userCountry?: string;
  userCountryCode?: string;
  userCity?: string;
  userDistrict?: string;
  zoneKey?: string;
  contextType?: string;
  intent: SearchIntent;
}

export interface RankedCandidate {
  candidate: SearchCandidate;
  score: number;
  bucket: string;
  reasons: string[];
  breakdown: {
    proximity: number;
    country_city: number;
    district_zone: number;
    text: number;
    popularity: number;
    category: number;
    serviceability: number;
  };
}

// ── Proximity bucket ──
function proximityScore(distKm: number | null): { score: number; bucket: string } {
  if (distKm == null) return { score: 0.1, bucket: "unknown" };
  if (distKm <= 5) return { score: 1.0, bucket: "0-5km" };
  if (distKm <= 15) return { score: 0.8, bucket: "5-15km" };
  if (distKm <= 50) return { score: 0.6, bucket: "15-50km" };
  return { score: 0.2, bucket: ">50km" };
}

// ── Country/City score — uses country_code as PRIMARY key ──
function countryCityScore(
  c: SearchCandidate,
  userCountry?: string,
  userCity?: string,
  userCountryCode?: string,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  
  // PRIMARY: compare country_code (ISO 2-letter)
  const candidateCC = (c.country_code ?? "").toUpperCase();
  const userCC = (userCountryCode ?? "").toUpperCase();
  
  // FALLBACK: country_name comparison
  const candidateCountryName = (c.country_name ?? "").toLowerCase();
  const userCountryName = (userCountry ?? "").toLowerCase();
  
  const candidateCity = (c.city ?? "").toLowerCase();
  const userCityLower = (userCity ?? "").toLowerCase();

  // No context → neutral
  if (!userCC && !userCountryName && !userCityLower) return { score: 0.5, reasons };

  let s = 0;

  // Country match — country_code is primary
  let sameCountry = false;
  if (userCC && candidateCC) {
    sameCountry = candidateCC === userCC;
  } else if (userCountryName && candidateCountryName) {
    sameCountry = candidateCountryName === userCountryName || 
                  candidateCountryName.includes(userCountryName) || 
                  userCountryName.includes(candidateCountryName);
  }

  if (sameCountry) {
    s += 0.6;
    reasons.push("same_country");
  } else if (userCC || userCountryName) {
    // We have context and it doesn't match → foreign penalty
    s -= 0.4;
    reasons.push("foreign");
  }

  // City match
  if (userCityLower && candidateCity) {
    if (candidateCity === userCityLower || candidateCity.includes(userCityLower) || userCityLower.includes(candidateCity)) {
      s += 0.4;
      reasons.push("same_city");
    }
  }

  return { score: Math.max(0, Math.min(1, s)), reasons };
}

// ── District/Zone score ──
function districtZoneScore(
  c: SearchCandidate,
  userDistrict?: string,
  zoneKey?: string,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  const pd = (c.district ?? "").toLowerCase();
  const ud = (userDistrict ?? "").toLowerCase();
  let s = 0;

  if (ud && pd && (pd === ud || pd.includes(ud) || ud.includes(pd))) {
    s += 0.7; reasons.push("same_district");
  }
  if (zoneKey && c.zone_key) {
    const pz = c.zone_key.toLowerCase();
    const uz = zoneKey.toLowerCase();
    if (pz === uz) { s += 0.3; reasons.push("exact_zone"); }
    else {
      const pp = pz.split("_"), up = uz.split("_");
      if (pp.length >= 2 && up.length >= 2 && pp[0] === up[0] && pp[1] === up[1]) {
        s += 0.15; reasons.push("zone_city");
      }
    }
  }
  return { score: Math.max(0, Math.min(1, s)), reasons };
}

// ── Text relevance ──
function textScore(query: string, c: SearchCandidate): number {
  const q = query.toLowerCase();
  const l = c.label.toLowerCase();
  const a = c.formatted_address.toLowerCase();
  const d = (c.district ?? "").toLowerCase();
  const ci = (c.city ?? "").toLowerCase();

  if (l === q || a === q) return 1.0;
  if (l.startsWith(q)) return 0.9;
  if (d.startsWith(q)) return 0.8;
  if (ci.startsWith(q)) return 0.75;
  if (a.includes(q)) return 0.6;
  if (l.includes(q)) return 0.55;
  return 0.2;
}

// ── Global bucket assignment — uses country_code as PRIMARY ──
function assignBucket(
  c: SearchCandidate,
  userCountry?: string,
  userCity?: string,
  userDistrict?: string,
  zoneKey?: string,
  userCountryCode?: string,
): string {
  const candidateCC = (c.country_code ?? "").toUpperCase();
  const userCC = (userCountryCode ?? "").toUpperCase();
  const candidateCountryName = (c.country_name ?? c.country_code ?? "").toLowerCase();
  const userCountryName = (userCountry ?? "").toLowerCase();
  const cc = (c.city ?? "").toLowerCase();
  const pd = (c.district ?? "").toLowerCase();
  const uci = (userCity ?? "").toLowerCase();
  const ud = (userDistrict ?? "").toLowerCase();

  // Zone match
  if (zoneKey && c.zone_key && c.zone_key.toLowerCase() === zoneKey.toLowerCase()) return "same_zone";
  // District
  if (ud && pd && (pd === ud || pd.includes(ud) || ud.includes(pd))) return "same_district";
  // City
  if (uci && cc && (cc === uci || cc.includes(uci) || uci.includes(cc))) return "same_city";
  // Country — country_code primary
  let sameCountry = false;
  if (userCC && candidateCC) {
    sameCountry = candidateCC === userCC;
  } else if (userCountryName && candidateCountryName) {
    sameCountry = candidateCountryName === userCountryName || 
                  candidateCountryName.includes(userCountryName) || 
                  userCountryName.includes(candidateCountryName);
  }
  if (sameCountry) return "same_country";
  return "international";
}

const BUCKET_PRIORITY: Record<string, number> = {
  same_zone: 0,
  same_district: 1,
  same_city: 2,
  same_country: 3,
  international: 4,
  unknown: 5,
};

// ── Main ranker ──
export function localRank(candidates: SearchCandidate[], ctx: RankingContext): RankedCandidate[] {
  const isExplicitForeign = ctx.intent.isExplicitForeign;
  const isAmbiguous = ctx.intent.isAmbiguousShort;
  const mode = resolveSearchMode(ctx.contextType);
  const W = WEIGHTS[mode];

  const ranked = candidates.map(c => {
    const reasons: string[] = [];

    // Distance
    let distKm: number | null = null;
    if (ctx.userLat != null && ctx.userLng != null) {
      distKm = haversineKm(ctx.userLat, ctx.userLng, c.lat, c.lng);
    }
    const prox = proximityScore(distKm);

    // Country/City — using country_code as primary
    const cc = isExplicitForeign
      ? { score: 0.5, reasons: [] as string[] }
      : countryCityScore(c, ctx.userCountry, ctx.userCity, ctx.userCountryCode);

    // District/Zone
    const dz = districtZoneScore(c, ctx.userDistrict, ctx.zoneKey);

    // Text
    const ts = textScore(ctx.query, c);

    // Popularity
    const pop = Math.min((c.popularity_score ?? 0) / 100, 1);

    // Category (placeholder)
    const cat = 0.5;
    // Serviceability (placeholder)
    const svc = 0.5;

    // Base score — mode-aware weights
    let score =
      prox.score * W.proximity +
      cc.score * W.country_city +
      dz.score * W.district_zone +
      ts * W.text +
      pop * W.popularity +
      cat * W.category +
      svc * W.serviceability;

    // SHORT AMBIGUOUS QUERY MODE — aggressive local bias
    const bucket = assignBucket(c, ctx.userCountry, ctx.userCity, ctx.userDistrict, ctx.zoneKey, ctx.userCountryCode);

    // ── STRICT ADDRESS MODE: crush foreign + far + incompatible place types ──
    if (mode === "strict_address") {
      if (bucket === "international") {
        score *= 0.10; // nearly invisible
        reasons.push("strict_foreign_crush");
      } else if (bucket === "same_country" && distKm != null && distKm > 50) {
        score *= 0.40; // far same-country penalty
        reasons.push("strict_far_penalty");
      }
      // Penalize landmarks/malls/airports as delivery addresses
      score *= strictPlaceTypePenalty(c.place_type);
      if (strictPlaceTypePenalty(c.place_type) < 1) {
        reasons.push("strict_place_type_penalty");
      }
      // Distance hard penalty for strict mode
      if (distKm != null && distKm > 25) {
        score *= 0.50;
        reasons.push("strict_distance_penalty");
      }
    } else if (isAmbiguous && !isExplicitForeign) {
      if (bucket === "international") {
        score *= 0.25; // Very aggressive penalty
        reasons.push("ambiguous_foreign_penalty");
      } else if (bucket === "same_country") {
        score *= 0.85;
      } else if (bucket === "same_zone" || bucket === "same_district") {
        score *= 1.15;
        reasons.push("ambiguous_local_boost");
      }
    } else if (!isExplicitForeign) {
      if (bucket === "international") score *= 0.4;
      else if (bucket === "same_country") score *= 0.9;
    }

    // Confidence tiebreaker
    score += (c.confidence_score ?? 0.5) * 0.01;

    reasons.push(...cc.reasons, ...dz.reasons);
    if (prox.score >= 0.8) reasons.push("nearby");
    if (ts > 0.7) reasons.push("text_match");
    if (pop > 0.5) reasons.push("popular");

    return {
      candidate: c,
      score,
      bucket,
      reasons,
      breakdown: {
        proximity: prox.score,
        country_city: cc.score,
        district_zone: dz.score,
        text: ts,
        popularity: pop,
        category: cat,
        serviceability: svc,
      },
    };
  })
  .sort((a, b) => {
    // Primary: bucket priority
    const bpA = BUCKET_PRIORITY[a.bucket] ?? 5;
    const bpB = BUCKET_PRIORITY[b.bucket] ?? 5;
    if (bpA !== bpB) return bpA - bpB;
    // Secondary: score within bucket
    return b.score - a.score;
  });

  // Debug logging in dev
  if (import.meta.env.DEV && ranked.length > 0) {
    console.log(`[SearchBrain] Query: "${ctx.query}" | Mode: ${mode} | Ambiguous: ${isAmbiguous} | Country: ${ctx.userCountryCode ?? ctx.userCountry ?? "?"} | City: ${ctx.userCity ?? "?"}`);
    ranked.slice(0, 5).forEach((r, i) => {
      console.log(`  #${i + 1} [${r.bucket}] ${r.candidate.label} (${r.candidate.country_code ?? "?"}) → ${r.score.toFixed(3)} | ${r.reasons.join(", ")}`);
    });
  }

  return ranked;
}
