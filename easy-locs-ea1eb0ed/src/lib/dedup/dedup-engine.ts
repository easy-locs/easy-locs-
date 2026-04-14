/**
 * Multi-Signal Deduplication Engine (Storefront)
 * ==================================
 * TASK #65: Now delegates core scoring to canonical-dedup-engine with
 * the "storefront" strategy. Public API preserved for backward compatibility.
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
import {
  computeCanonicalDedupScore,
  STRATEGIES,
  type DedupCandidate as CanonicalCandidate,
} from "@/lib/dedup/canonical-dedup-engine";

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

function toCanonicalCandidate(c: DedupCandidate): CanonicalCandidate {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    address: c.address,
    lat: c.latitude,
    lng: c.longitude,
    website: c.website,
    sourceId: c.source_id,
    brandName: c.brand_name,
    branchLabel: c.branch_label,
    instagramUrl: c.instagram_url,
    city: c.city,
  };
}

function extractBrand(name: string): string {
  const normalized = name.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  const words = normalized.split(" ");
  return words.slice(0, Math.min(2, words.length)).join(" ");
}

function computeDedupScore(a: DedupCandidate, b: DedupCandidate): DedupMatch {
  const result = computeCanonicalDedupScore(
    toCanonicalCandidate(a),
    toCanonicalCandidate(b),
    STRATEGIES.storefront
  );

  const action: DedupMatch["action"] =
    result.action === "auto_merge" ? "auto_hide" :
    result.action === "review" ? "review" :
    "keep_separate";

  return {
    sourceId: a.id,
    matchId: b.id,
    sourceName: a.name,
    matchName: b.name,
    confidence: result.confidence,
    signals: result.signals,
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
