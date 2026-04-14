export interface DedupCandidate {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  website?: string | null;
  sourceId?: string | null;
  orgId?: string | null;
  vertical?: string | null;
  city?: string | null;
  photos?: string[];
  menuItems?: Array<Record<string, unknown>>;
  brandName?: string | null;
  branchLabel?: string | null;
  instagramUrl?: string | null;
}

export interface DedupSignal {
  signal: string;
  score: number;
  weight: number;
  detail?: string;
}

export interface DedupResult {
  entityA: string;
  entityB: string;
  confidence: number;
  action: "auto_merge" | "review" | "keep_separate";
  signals: DedupSignal[];
  matchedOn: string[];
  strategy: string;
}

export type DedupStrategyId =
  | "storefront"
  | "import"
  | "franchise"
  | "shadow"
  | "generic";

export interface DedupStrategy {
  id: DedupStrategyId;
  weights: DedupWeights;
  thresholds: DedupThresholds;
  hardBlockers: DedupHardBlocker[];
  preFilter?: (a: DedupCandidate, b: DedupCandidate) => boolean;
}

interface DedupWeights {
  name: number;
  phone: number;
  address: number;
  gps: number;
  website: number;
  sourceId: number;
  images: number;
  menu: number;
}

interface DedupThresholds {
  autoMerge: number;
  review: number;
}

interface DedupHardBlocker {
  signal: string;
  condition: string;
  maxConfidence: number;
}

const PROVIDER_NOISE = /deliveroo|talabat|careem|booking|noon|expedia|zomato|uber\s*eats|just\s*eat|grubhub|doordash|glovo|foodpanda|swiggy|bolt\s*food|wolt/gi;
const ARTICLES = /^(the|le|la|les|el|al|das|der|die|il|lo|ال|مطعم|مقهى|صيدلية|بقالة)\s+/i;
const PUNCTUATION = /[()|•·'"`\-—–_\/\\]/g;

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(PROVIDER_NOISE, "")
    .replace(PUNCTUATION, " ")
    .replace(ARTICLES, "")
    .replace(/\b(restaurant|cafe|cafeteria|shop|store|market|salon|spa|center|centre)\b/gi, "")
    .replace(/[^a-z0-9\s\u0600-\u06FF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let cleaned = phone.replace(/[^0-9+]/g, "");
  cleaned = cleaned
    .replace(/^\+971/, "0").replace(/^\+33/, "0").replace(/^\+44/, "0")
    .replace(/^\+1/, "").replace(/^\+49/, "0").replace(/^\+91/, "0")
    .replace(/^\+966/, "0").replace(/^\+20/, "0").replace(/^\+234/, "0");
  return cleaned.slice(-9);
}

function normalizeDomain(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace("www.", "");
  } catch {
    return url.toLowerCase().trim();
  }
}

function normalizeAddress(a: string): string {
  return a.toLowerCase().replace(PROVIDER_NOISE, "").replace(/[^a-z0-9\u0600-\u06FF]/g, "").trim();
}

function levenshtein(a: string, b: string): number {
  if (a.length > 50 || b.length > 50) return a === b ? 0 : Math.max(a.length, b.length);
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

function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 1;
  if (!na || !nb) return 0;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 0;
  return Math.max(0, 1 - levenshtein(na, nb) / maxLen);
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normImageUrl(url: string): string {
  try { return new URL(url).pathname.toLowerCase(); }
  catch { return url.toLowerCase(); }
}

function imageOverlap(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a.map(normImageUrl));
  const overlap = b.filter(img => setA.has(normImageUrl(img))).length;
  return overlap / Math.min(a.length, b.length);
}

function menuFingerprint(items: Array<Record<string, unknown>>): Set<string> {
  return new Set(items.map(i => normalizeName(String(i.name || ""))).filter(Boolean));
}

function menuOverlap(a: Array<Record<string, unknown>>, b: Array<Record<string, unknown>>): number {
  const fpA = menuFingerprint(a);
  const fpB = menuFingerprint(b);
  if (!fpA.size || !fpB.size) return 0;
  let overlap = 0;
  for (const item of fpA) { if (fpB.has(item)) overlap++; }
  return overlap / Math.min(fpA.size, fpB.size);
}

export const STRATEGIES: Record<DedupStrategyId, DedupStrategy> = {
  storefront: {
    id: "storefront",
    weights: { name: 25, phone: 20, address: 10, gps: 30, website: 5, sourceId: 10, images: 0, menu: 0 },
    thresholds: { autoMerge: 95, review: 70 },
    hardBlockers: [
      { signal: "gps", condition: "distance_gt_150m", maxConfidence: 50 },
      { signal: "phone", condition: "different", maxConfidence: 60 },
      { signal: "address", condition: "similarity_lt_0.4", maxConfidence: 65 },
      { signal: "name", condition: "similarity_lt_0.75", maxConfidence: 65 },
    ],
  },
  import: {
    id: "import",
    weights: { name: 30, phone: 20, address: 10, gps: 25, website: 10, sourceId: 0, images: 5, menu: 5 },
    thresholds: { autoMerge: 90, review: 45 },
    hardBlockers: [],
  },
  franchise: {
    id: "franchise",
    weights: { name: 40, phone: 10, address: 10, gps: 20, website: 10, sourceId: 0, images: 5, menu: 5 },
    thresholds: { autoMerge: 95, review: 85 },
    hardBlockers: [],
    preFilter: (a, b) => a.orgId !== b.orgId && a.city === b.city && a.vertical === b.vertical,
  },
  shadow: {
    id: "shadow",
    weights: { name: 50, phone: 0, address: 0, gps: 0, website: 0, sourceId: 30, images: 0, menu: 0 },
    thresholds: { autoMerge: 95, review: 80 },
    hardBlockers: [],
  },
  generic: {
    id: "generic",
    weights: { name: 30, phone: 20, address: 10, gps: 25, website: 5, sourceId: 5, images: 5, menu: 0 },
    thresholds: { autoMerge: 90, review: 65 },
    hardBlockers: [
      { signal: "gps", condition: "distance_gt_150m", maxConfidence: 50 },
      { signal: "phone", condition: "different", maxConfidence: 60 },
    ],
  },
};

export function computeCanonicalDedupScore(
  a: DedupCandidate,
  b: DedupCandidate,
  strategy: DedupStrategy
): DedupResult {
  const signals: DedupSignal[] = [];
  const matchedOn: string[] = [];
  const w = strategy.weights;
  let totalWeight = 0;
  let totalScore = 0;

  if (strategy.preFilter && !strategy.preFilter(a, b)) {
    return { entityA: a.id, entityB: b.id, confidence: 0, action: "keep_separate", signals: [], matchedOn: [], strategy: strategy.id };
  }

  const nameSim = nameSimilarity(a.name, b.name);
  if (w.name > 0) {
    signals.push({ signal: "name", score: nameSim, weight: w.name, detail: `${(nameSim * 100).toFixed(0)}%` });
    totalWeight += w.name;
    totalScore += nameSim * w.name;
    if (nameSim >= 0.75) matchedOn.push("name");
  }

  const pa = normalizePhone(a.phone);
  const pb = normalizePhone(b.phone);
  if (w.phone > 0 && pa && pb) {
    const phoneScore = pa === pb ? 1 : (pa.length >= 7 && pb.length >= 7 && (pa.endsWith(pb.slice(-7)) || pb.endsWith(pa.slice(-7)))) ? 0.6 : 0;
    signals.push({ signal: "phone", score: phoneScore, weight: w.phone, detail: phoneScore === 1 ? "match" : phoneScore > 0 ? "partial" : "different" });
    totalWeight += w.phone;
    totalScore += phoneScore * w.phone;
    if (phoneScore > 0) matchedOn.push("phone");
  }

  if (w.address > 0 && a.address && b.address) {
    const aa = normalizeAddress(a.address);
    const ab = normalizeAddress(b.address);
    const addrSim = aa === ab ? 1 : (aa.length > 10 && ab.length > 10 && (aa.includes(ab.slice(0, 15)) || ab.includes(aa.slice(0, 15)))) ? 0.5 : nameSimilarity(a.address, b.address);
    signals.push({ signal: "address", score: addrSim, weight: w.address, detail: `${(addrSim * 100).toFixed(0)}%` });
    totalWeight += w.address;
    totalScore += addrSim * w.address;
    if (addrSim >= 0.5) matchedOn.push("address");
  }

  let gpsDistM: number | null = null;
  if (w.gps > 0 && a.lat != null && a.lng != null && b.lat != null && b.lng != null) {
    gpsDistM = haversineMeters(a.lat, a.lng, b.lat, b.lng);
    let gpsScore = 0;
    if (gpsDistM < 30) gpsScore = 1;
    else if (gpsDistM < 50) gpsScore = 0.9;
    else if (gpsDistM < 75) gpsScore = 0.8;
    else if (gpsDistM < 100) gpsScore = 0.6;
    else if (gpsDistM < 150) gpsScore = 0.5;
    else if (gpsDistM < 200) gpsScore = 0.3;
    signals.push({ signal: "gps", score: gpsScore, weight: w.gps, detail: `${gpsDistM.toFixed(0)}m` });
    totalWeight += w.gps;
    totalScore += gpsScore * w.gps;
    if (gpsScore >= 0.5) matchedOn.push("geo");
  }

  if (w.website > 0 && a.website && b.website && normalizeDomain(a.website) === normalizeDomain(b.website)) {
    signals.push({ signal: "website", score: 1, weight: w.website });
    totalWeight += w.website;
    totalScore += w.website;
    matchedOn.push("website");
  }

  if (w.sourceId > 0 && a.sourceId && b.sourceId) {
    const srcScore = a.sourceId === b.sourceId ? 1 : 0;
    signals.push({ signal: "source_id", score: srcScore, weight: w.sourceId, detail: srcScore ? "match" : "different" });
    totalWeight += w.sourceId;
    totalScore += srcScore * w.sourceId;
    if (srcScore > 0) matchedOn.push("source_id");
  }

  if (w.images > 0 && (a.photos?.length ?? 0) > 0 && (b.photos?.length ?? 0) > 0) {
    const imgOverlap = imageOverlap(a.photos!, b.photos!);
    if (imgOverlap > 0.3) {
      signals.push({ signal: "images", score: imgOverlap, weight: w.images });
      totalWeight += w.images;
      totalScore += imgOverlap * w.images;
      matchedOn.push("images");
    }
  }

  if (w.menu > 0 && (a.menuItems?.length ?? 0) > 0 && (b.menuItems?.length ?? 0) > 0) {
    const mOverlap = menuOverlap(a.menuItems!, b.menuItems!);
    if (mOverlap > 0.4) {
      signals.push({ signal: "menu", score: mOverlap, weight: w.menu });
      totalWeight += w.menu;
      totalScore += mOverlap * w.menu;
      matchedOn.push("menu");
    }
  }

  let confidence = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;

  for (const blocker of strategy.hardBlockers) {
    if (blocker.signal === "gps" && gpsDistM !== null && gpsDistM > 150) {
      confidence = Math.min(confidence, blocker.maxConfidence);
    }
    if (blocker.signal === "phone" && pa && pb && pa !== pb) {
      confidence = Math.min(confidence, blocker.maxConfidence);
    }
    if (blocker.signal === "address") {
      const addrSignal = signals.find(s => s.signal === "address");
      if (addrSignal && addrSignal.score < 0.4) {
        confidence = Math.min(confidence, blocker.maxConfidence);
      }
    }
    if (blocker.signal === "name" && nameSim < 0.75) {
      confidence = Math.min(confidence, blocker.maxConfidence);
    }
  }

  const action: DedupResult["action"] =
    confidence >= strategy.thresholds.autoMerge ? "auto_merge" :
    confidence >= strategy.thresholds.review ? "review" :
    "keep_separate";

  return { entityA: a.id, entityB: b.id, confidence, action, signals, matchedOn, strategy: strategy.id };
}

export function detectDuplicates(
  records: DedupCandidate[],
  strategyId: DedupStrategyId = "generic"
): DedupResult[] {
  const strategy = STRATEGIES[strategyId];
  const results: DedupResult[] = [];
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const result = computeCanonicalDedupScore(records[i], records[j], strategy);
      if (result.action !== "keep_separate") {
        results.push(result);
      }
    }
  }
  return results;
}

export function groupByDuplicates(
  records: DedupCandidate[],
  matches: DedupResult[]
): DedupCandidate[][] {
  const idToGroup = new Map<string, number>();
  const groups: DedupCandidate[][] = [];

  for (const r of records) {
    if (!idToGroup.has(r.id)) {
      idToGroup.set(r.id, groups.length);
      groups.push([r]);
    }
  }

  for (const m of matches) {
    const gA = idToGroup.get(m.entityA);
    const gB = idToGroup.get(m.entityB);
    if (gA !== undefined && gB !== undefined && gA !== gB) {
      groups[gA].push(...groups[gB]);
      for (const r of groups[gB]) {
        idToGroup.set(r.id, gA);
      }
      groups[gB] = [];
    }
  }

  return groups.filter(g => g.length > 0);
}

export function getStrategy(id: DedupStrategyId): DedupStrategy {
  return STRATEGIES[id];
}
