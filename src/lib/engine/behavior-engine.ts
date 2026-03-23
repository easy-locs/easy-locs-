/**
 * BEHAVIOR ENGINE — Tracks user behavior signals for personalization.
 * ====================================================================
 * Client-side only. No PII stored. Lightweight session-level tracking.
 *
 * Layer: System Capabilities.
 * Feeds into: Ranking Engine (future personalization weights).
 * Does NOT mix with: Business Taxonomy, Action Model.
 */

// ═══════════════════════════════════════════════════════════
//  BEHAVIOR SIGNALS
// ═══════════════════════════════════════════════════════════

export interface BehaviorSignal {
  type: BehaviorType;
  entityId?: string;
  vertical?: string;
  subcategory?: string;
  city?: string;
  timestamp: number;
}

export type BehaviorType =
  | "view"        // viewed an entity detail
  | "search"      // searched for something
  | "filter"      // applied a filter
  | "order"       // placed an order
  | "bookmark"    // saved/favorited
  | "share"       // shared an entity
  | "call"        // called a business
  | "navigate"    // navigated to a business
  | "scan";       // scanned QR

// ═══════════════════════════════════════════════════════════
//  SESSION STORE (in-memory, no persistence)
// ═══════════════════════════════════════════════════════════

const SESSION_SIGNALS: BehaviorSignal[] = [];
const MAX_SESSION_SIGNALS = 200;

export function trackBehavior(signal: Omit<BehaviorSignal, "timestamp">): void {
  if (SESSION_SIGNALS.length >= MAX_SESSION_SIGNALS) {
    SESSION_SIGNALS.shift();
  }
  SESSION_SIGNALS.push({ ...signal, timestamp: Date.now() });
}

export function getSessionSignals(): readonly BehaviorSignal[] {
  return SESSION_SIGNALS;
}

export function clearSessionSignals(): void {
  SESSION_SIGNALS.length = 0;
}

// ═══════════════════════════════════════════════════════════
//  PREFERENCE EXTRACTION
// ═══════════════════════════════════════════════════════════

export interface UserPreferences {
  /** Most viewed/interacted verticals, sorted by frequency. */
  topVerticals: string[];
  /** Most viewed/interacted subcategories, sorted by frequency. */
  topSubcategories: string[];
  /** Most active city. */
  primaryCity?: string;
  /** Total session interactions. */
  interactionCount: number;
}

/**
 * Extract user preferences from current session signals.
 * Lightweight — runs client-side from in-memory data.
 */
export function extractPreferences(): UserPreferences {
  const verticalCounts: Record<string, number> = {};
  const subCounts: Record<string, number> = {};
  const cityCounts: Record<string, number> = {};

  for (const sig of SESSION_SIGNALS) {
    if (sig.vertical) verticalCounts[sig.vertical] = (verticalCounts[sig.vertical] ?? 0) + 1;
    if (sig.subcategory) subCounts[sig.subcategory] = (subCounts[sig.subcategory] ?? 0) + 1;
    if (sig.city) cityCounts[sig.city] = (cityCounts[sig.city] ?? 0) + 1;
  }

  const sorted = (counts: Record<string, number>) =>
    Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k]) => k);

  return {
    topVerticals: sorted(verticalCounts).slice(0, 5),
    topSubcategories: sorted(subCounts).slice(0, 10),
    primaryCity: sorted(cityCounts)[0],
    interactionCount: SESSION_SIGNALS.length,
  };
}

/**
 * Compute a personalization boost (0–1) for an entity based on user behavior.
 * Can be fed into the ranking engine as an additional signal.
 */
export function personalRelevanceScore(
  vertical?: string | null,
  subcategory?: string | null
): number {
  if (!SESSION_SIGNALS.length) return 0;

  const prefs = extractPreferences();
  let score = 0;

  if (vertical && prefs.topVerticals.includes(vertical)) {
    const idx = prefs.topVerticals.indexOf(vertical);
    score += 0.3 * (1 - idx / 5); // higher rank = higher score
  }

  if (subcategory && prefs.topSubcategories.includes(subcategory)) {
    const idx = prefs.topSubcategories.indexOf(subcategory);
    score += 0.5 * (1 - idx / 10);
  }

  return Math.min(1, score);
}
