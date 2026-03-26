/**
 * Search Local Ranker — Local-first ranking with bucket system.
 * 
 * This is the ONLY ranking truth. No UI may re-sort after this.
 *
 * Buckets: same_zone → same_district → same_city → same_country → international
 * 
 * Weights:
 *   0.30 proximity + 0.20 country_city + 0.15 district_zone
 * + 0.15 text + 0.10 popularity + 0.05 category + 0.05 serviceability
 */
import { haversineKm } from "@/lib/geo/distance";
import type { SearchCandidate } from "./search-provider-normalizer";
import type { SearchIntent } from "./search-intent-resolver";

const W_PROXIMITY = 0.30;
const W_COUNTRY_CITY = 0.20;
const W_DISTRICT_ZONE = 0.15;
const W_TEXT = 0.15;
const W_POPULARITY = 0.10;
const W_CATEGORY = 0.05;
const W_SERVICEABILITY = 0.05;

interface RankingContext {
  query: string;
  userLat?: number;
  userLng?: number;
  userCountry?: string;
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

// ── Country/City score ──
function countryCityScore(
  c: SearchCandidate,
  userCountry?: string,
  userCity?: string,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  const pc = (c.country_name ?? c.country_code ?? "").toLowerCase();
  const cc = (c.city ?? "").toLowerCase();
  const uc = (userCountry ?? "").toLowerCase();
  const uci = (userCity ?? "").toLowerCase();

  if (!uc && !uci) return { score: 0.5, reasons };

  let s = 0;
  // Country
  if (uc && pc) {
    if (pc === uc || pc.includes(uc) || uc.includes(pc)) {
      s += 0.6; reasons.push("same_country");
    } else {
      s -= 0.4; reasons.push("foreign");
    }
  }
  // City
  if (uci && cc) {
    if (cc === uci || cc.includes(uci) || uci.includes(cc)) {
      s += 0.4; reasons.push("same_city");
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

// ── Global bucket assignment ──
function assignBucket(
  c: SearchCandidate,
  userCountry?: string,
  userCity?: string,
  userDistrict?: string,
  zoneKey?: string,
): string {
  const pc = (c.country_name ?? c.country_code ?? "").toLowerCase();
  const cc = (c.city ?? "").toLowerCase();
  const pd = (c.district ?? "").toLowerCase();
  const uc = (userCountry ?? "").toLowerCase();
  const uci = (userCity ?? "").toLowerCase();
  const ud = (userDistrict ?? "").toLowerCase();

  // Zone match
  if (zoneKey && c.zone_key && c.zone_key.toLowerCase() === zoneKey.toLowerCase()) return "same_zone";
  // District
  if (ud && pd && (pd === ud || pd.includes(ud) || ud.includes(pd))) return "same_district";
  // City
  if (uci && cc && (cc === uci || cc.includes(uci) || uci.includes(cc))) return "same_city";
  // Country
  if (uc && pc && (pc === uc || pc.includes(uc) || uc.includes(pc))) return "same_country";
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

  return candidates.map(c => {
    const reasons: string[] = [];

    // Distance
    let distKm: number | null = null;
    if (ctx.userLat != null && ctx.userLng != null) {
      distKm = haversineKm(ctx.userLat, ctx.userLng, c.lat, c.lng);
    }
    const prox = proximityScore(distKm);

    // Country/City
    const cc = isExplicitForeign
      ? { score: 0.5, reasons: [] as string[] }
      : countryCityScore(c, ctx.userCountry, ctx.userCity);

    // District/Zone
    const dz = districtZoneScore(c, ctx.userDistrict, ctx.zoneKey);

    // Text
    const ts = textScore(ctx.query, c);

    // Popularity
    const pop = Math.min((c.popularity_score ?? 0) / 100, 1);

    // Category (placeholder — always 0.5 until category brain integration)
    const cat = 0.5;

    // Serviceability (placeholder)
    const svc = 0.5;

    // Score
    let score =
      prox.score * W_PROXIMITY +
      cc.score * W_COUNTRY_CITY +
      dz.score * W_DISTRICT_ZONE +
      ts * W_TEXT +
      pop * W_POPULARITY +
      cat * W_CATEGORY +
      svc * W_SERVICEABILITY;

    // Ambiguous short query boost: amplify local context even more
    if (isAmbiguous && !isExplicitForeign) {
      // Extra penalty for foreign results on ambiguous queries
      const bucket = assignBucket(c, ctx.userCountry, ctx.userCity, ctx.userDistrict, ctx.zoneKey);
      if (bucket === "international") score *= 0.4;
      else if (bucket === "same_country") score *= 0.9;
    }

    // Confidence tiebreaker
    score += (c.confidence_score ?? 0.5) * 0.01;

    reasons.push(...cc.reasons, ...dz.reasons);
    if (prox.score >= 0.8) reasons.push("nearby");
    if (ts > 0.7) reasons.push("text_match");
    if (pop > 0.5) reasons.push("popular");

    const bucket = assignBucket(c, ctx.userCountry, ctx.userCity, ctx.userDistrict, ctx.zoneKey);

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
}
