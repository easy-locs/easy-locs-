/**
 * Multi-Signal Deduplication Engine
 * ==================================
 * Replaces naive name+city matching with a weighted scoring system.
 * 
 * CRITICAL RULES:
 * - Same brand ≠ duplicate (chains/franchises are NOT duplicates)
 * - Only same LOCATION triggers dedup
 * - GPS distance > 150m → NEVER auto-merge
 * - Different phone → NEVER auto-merge
 * - Auto-merge only if confidence > 95
 * - 70-95 → review_required
 * - < 70 → separate shops
 */

import { db } from "@/services/db";
import { haversineKm } from "@/lib/geo/distance";

// ── Types ──

export interface DedupCandidate {
  id: string;
  name: string;
  brand_name?: string | null;
  branch_label?: string | null;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  source_id?: string | null;
  website?: string | null;
  instagram_url?: string | null;
}

export interface DedupMatch {
  sourceId: string;
  matchId: string;
  sourceName: string;
  matchName: string;
  confidence: number;
  signals: DedupSignal[];
  action: "auto_hide" | "review" | "keep_separate";
}

interface DedupSignal {
  signal: string;
  score: number;
  weight: number;
  detail?: string;
}

// ── Normalization ──

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/\b(restaurant|cafe|cafeteria|shop|store|market|salon|spa|center|centre)\b/gi, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  return phone.replace(/[^0-9]/g, "").slice(-9); // last 9 digits
}

function extractBrand(name: string): string {
  // Extract first meaningful word(s) as brand
  const normalized = normalizeName(name);
  const words = normalized.split(" ");
  return words.slice(0, Math.min(2, words.length)).join(" ");
}

// ── Similarity ──

function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 1;

  // Levenshtein-based similarity
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(na, nb);
  return Math.max(0, 1 - dist / maxLen);
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// ── Scoring Engine ──

const WEIGHTS = {
  name: 25,
  gps: 30,
  phone: 20,
  address: 10,
  source_id: 10,
  web: 5,
};

function computeDedupScore(a: DedupCandidate, b: DedupCandidate): DedupMatch {
  const signals: DedupSignal[] = [];
  let totalWeight = 0;
  let totalScore = 0;

  // 1. Name similarity
  const nameSim = stringSimilarity(a.name, b.name);
  signals.push({ signal: "name", score: nameSim, weight: WEIGHTS.name, detail: `${(nameSim * 100).toFixed(0)}%` });
  totalWeight += WEIGHTS.name;
  totalScore += nameSim * WEIGHTS.name;

  // 2. GPS distance (CRITICAL — hard blocker)
  let gpsScore = 0;
  let gpsDistM: number | null = null;
  if (a.latitude && a.longitude && b.latitude && b.longitude) {
    const distKm = haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
    gpsDistM = distKm * 1000;
    if (gpsDistM < 30) gpsScore = 1;
    else if (gpsDistM < 75) gpsScore = 0.8;
    else if (gpsDistM < 150) gpsScore = 0.5;
    else gpsScore = 0; // > 150m = hard block
    signals.push({ signal: "gps", score: gpsScore, weight: WEIGHTS.gps, detail: `${gpsDistM.toFixed(0)}m` });
    totalWeight += WEIGHTS.gps;
    totalScore += gpsScore * WEIGHTS.gps;
  }

  // 3. Phone match
  const pa = normalizePhone(a.phone);
  const pb = normalizePhone(b.phone);
  if (pa && pb) {
    const phoneScore = pa === pb ? 1 : 0;
    signals.push({ signal: "phone", score: phoneScore, weight: WEIGHTS.phone, detail: phoneScore ? "match" : "different" });
    totalWeight += WEIGHTS.phone;
    totalScore += phoneScore * WEIGHTS.phone;
  }

  // 4. Address similarity
  if (a.address && b.address) {
    const addrSim = stringSimilarity(a.address, b.address);
    signals.push({ signal: "address", score: addrSim, weight: WEIGHTS.address, detail: `${(addrSim * 100).toFixed(0)}%` });
    totalWeight += WEIGHTS.address;
    totalScore += addrSim * WEIGHTS.address;
  }

  // 5. External ID / source match
  if (a.source_id && b.source_id) {
    const srcScore = a.source_id === b.source_id ? 1 : 0;
    signals.push({ signal: "source_id", score: srcScore, weight: WEIGHTS.source_id, detail: srcScore ? "match" : "different" });
    totalWeight += WEIGHTS.source_id;
    totalScore += srcScore * WEIGHTS.source_id;
  }

  // 6. Web / Instagram match
  if (a.website && b.website) {
    const webScore = a.website.replace(/https?:\/\//, "").replace(/\/$/, "") === b.website.replace(/https?:\/\//, "").replace(/\/$/, "") ? 1 : 0;
    signals.push({ signal: "web", score: webScore, weight: WEIGHTS.web });
    totalWeight += WEIGHTS.web;
    totalScore += webScore * WEIGHTS.web;
  }

  // Normalize to 0-100
  const confidence = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;

  // ── HARD BLOCKERS ──
  let finalConfidence = confidence;

  // GPS > 150m → cap at 50 (never auto-merge)
  if (gpsDistM !== null && gpsDistM > 150) {
    finalConfidence = Math.min(finalConfidence, 50);
  }

  // Different phone → cap at 60
  if (pa && pb && pa !== pb) {
    finalConfidence = Math.min(finalConfidence, 60);
  }

  // Different address with low similarity → cap at 65
  const addrSignal = signals.find(s => s.signal === "address");
  if (addrSignal && addrSignal.score < 0.4) {
    finalConfidence = Math.min(finalConfidence, 65);
  }

  // LOW NAME SIMILARITY → cap at 65 (dark kitchen / multi-concept protection)
  // Same phone + same GPS but different concept name = NOT a duplicate
  // Threshold at 0.75 catches "Cloud Kitchen Burgers" vs "Cloud Kitchen Sushi" (71%)
  if (nameSim < 0.75) {
    finalConfidence = Math.min(finalConfidence, 65);
  }

  const action: DedupMatch["action"] =
    finalConfidence > 95 ? "auto_hide" :
    finalConfidence >= 70 ? "review" :
    "keep_separate";

  return {
    sourceId: a.id,
    matchId: b.id,
    sourceName: a.name,
    matchName: b.name,
    confidence: finalConfidence,
    signals,
    action,
  };
}

// ── Public API ──

/**
 * Scan all storefronts for duplicates using multi-signal scoring.
 * Groups by normalized brand + city first, then scores within groups.
 */
export async function runDedupScan(): Promise<{
  autoHide: DedupMatch[];
  review: DedupMatch[];
  safe: number;
  scanned: number;
}> {
  const { data: shops } = await db
    .from("storefront_pages")
    .select("id, name, city, address, contact_phone, latitude, longitude, source_external_id, brand_name, branch_label")
    .is("duplicate_of", null) // skip already-deduped
    .limit(1000);

  if (!shops?.length) return { autoHide: [], review: [], safe: 0, scanned: 0 };

  // Map DB columns to candidate interface
  const candidates: DedupCandidate[] = shops.map((s: any) => ({
    ...s,
    phone: s.contact_phone,
    source_id: s.source_external_id,
  }));
  const autoHide: DedupMatch[] = [];
  const review: DedupMatch[] = [];

  // Group by normalized brand + city for efficiency
  const groups = new Map<string, DedupCandidate[]>();
  for (const c of candidates) {
    const key = `${extractBrand(c.name)}_${(c.city || "").toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  // Score within each group
  groups.forEach((group) => {
    if (group.length < 2) return;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const match = computeDedupScore(group[i], group[j]);
        if (match.action === "auto_hide") autoHide.push(match);
        else if (match.action === "review") review.push(match);
      }
    }
  });

  return {
    autoHide,
    review,
    safe: candidates.length - autoHide.length - review.length,
    scanned: candidates.length,
  };
}

/**
 * Apply dedup results: hide auto-confirmed duplicates, flag reviews.
 */
export async function applyDedupResults(results: {
  autoHide: DedupMatch[];
  review: DedupMatch[];
}): Promise<{ hidden: number; flagged: number; errors: string[] }> {
  const errors: string[] = [];
  let hidden = 0;
  let flagged = 0;

  // Auto-hide: mark the match (second shop) as duplicate of source
  for (const m of results.autoHide) {
    const { error } = await db
      .from("storefront_pages")
      .update({
        duplicate_of: m.sourceId,
        duplicate_confidence: m.confidence,
        visibility_mode: "hidden",
        review_required: false,
      })
      .eq("id", m.matchId);

    if (error) errors.push(`hide ${m.matchId}: ${error.message}`);
    else hidden++;
  }

  // Review: flag for manual review
  for (const m of results.review) {
    const { error } = await db
      .from("storefront_pages")
      .update({
        duplicate_confidence: m.confidence,
        review_required: true,
      })
      .eq("id", m.matchId);

    if (error) errors.push(`flag ${m.matchId}: ${error.message}`);
    else flagged++;
  }

  return { hidden, flagged, errors };
}

/**
 * Check a single new shop against existing ones before ingestion.
 */
export async function checkNewShopDuplicate(candidate: DedupCandidate): Promise<DedupMatch | null> {
  // Find potential matches in same city with similar name
  const brand = extractBrand(candidate.name);
  const { data: potentials } = await db
    .from("storefront_pages")
    .select("id, name, city, address, contact_phone, latitude, longitude, source_external_id")
    .eq("city", candidate.city)
    .ilike("name", `%${brand}%`)
    .is("duplicate_of", null)
    .limit(50);

  if (!potentials?.length) return null;

  const mapped = potentials.map((p: any) => ({
    ...p,
    phone: p.contact_phone,
    source_id: p.source_external_id,
  }));

  let bestMatch: DedupMatch | null = null;
  for (const p of mapped) {
    const match = computeDedupScore(candidate, p);
    if (!bestMatch || match.confidence > bestMatch.confidence) {
      bestMatch = match;
    }
  }

  return bestMatch && bestMatch.confidence >= 70 ? bestMatch : null;
}

// Re-export for backward compatibility with duplicateGuard
export { checkNewShopDuplicate as checkStorefrontDuplicate };
