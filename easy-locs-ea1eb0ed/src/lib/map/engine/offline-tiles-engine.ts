/**
 * Offline tiles engine — Pre-fetches vector tiles for the user's frequent
 * areas, stores them via Cache Storage, manages quotas and purge.
 *
 * Strategy:
 *   - Track user's recent map centers in localStorage (last N).
 *   - Periodically (or on demand) compute hot zones (DBSCAN-lite) and pre-fetch
 *     tile pyramids around each at relevant zoom levels.
 *   - Respect navigator.storage.estimate() quota; purge oldest entries when
 *     approaching the budget.
 */

const STORAGE_KEY = "easylocs:offline-tiles:history";
const CACHE_NAME = "easylocs-tiles-v1";
const MAX_HISTORY = 200;
const DEFAULT_QUOTA_MB = 60;

export interface MapVisit {
  lat: number;
  lng: number;
  zoom: number;
  ts: number;
}

export interface HotZone {
  lat: number;
  lng: number;
  weight: number;
}

export function recordVisit(visit: Omit<MapVisit, "ts">) {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr: MapVisit[] = raw ? JSON.parse(raw) : [];
    arr.push({ ...visit, ts: Date.now() });
    if (arr.length > MAX_HISTORY) arr.splice(0, arr.length - MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {}
}

export function getVisits(): MapVisit[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Cluster visits into hot zones using a simple grid bucket. */
export function computeHotZones(visits: MapVisit[], gridDeg = 0.02, topN = 5): HotZone[] {
  const buckets = new Map<string, { lat: number; lng: number; n: number }>();
  for (const v of visits) {
    const key = `${Math.round(v.lat / gridDeg)}:${Math.round(v.lng / gridDeg)}`;
    const b = buckets.get(key);
    if (b) {
      b.lat += v.lat; b.lng += v.lng; b.n += 1;
    } else {
      buckets.set(key, { lat: v.lat, lng: v.lng, n: 1 });
    }
  }
  return [...buckets.values()]
    .map((b) => ({ lat: b.lat / b.n, lng: b.lng / b.n, weight: b.n }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, topN);
}

function lonLatToTile(lon: number, lat: number, z: number): [number, number] {
  const n = Math.pow(2, z);
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return [x, y];
}

export interface PrefetchPlan {
  zone: HotZone;
  zoom: number;
  tiles: Array<{ z: number; x: number; y: number }>;
}

export function buildPrefetchPlan(
  zone: HotZone,
  opts: { zooms?: number[]; radiusTiles?: number } = {},
): PrefetchPlan[] {
  const zooms = opts.zooms ?? [12, 14, 15];
  const radius = opts.radiusTiles ?? 2;
  return zooms.map((z) => {
    const [cx, cy] = lonLatToTile(zone.lng, zone.lat, z);
    const tiles: Array<{ z: number; x: number; y: number }> = [];
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        tiles.push({ z, x: cx + dx, y: cy + dy });
      }
    }
    return { zone, zoom: z, tiles };
  });
}

export interface QuotaReport {
  usageBytes: number;
  quotaBytes: number;
  budgetBytes: number;
  exceeds: boolean;
}

export async function getQuota(budgetMb = DEFAULT_QUOTA_MB): Promise<QuotaReport> {
  const budgetBytes = budgetMb * 1024 * 1024;
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return { usageBytes: 0, quotaBytes: 0, budgetBytes, exceeds: false };
  }
  const est = await navigator.storage.estimate();
  return {
    usageBytes: est.usage ?? 0,
    quotaBytes: est.quota ?? 0,
    budgetBytes,
    exceeds: (est.usage ?? 0) > budgetBytes,
  };
}

export async function prefetchTiles(
  templateUrl: string,
  plan: PrefetchPlan[],
  opts: { budgetMb?: number; concurrency?: number } = {},
): Promise<{ fetched: number; skipped: number }> {
  if (typeof caches === "undefined") return { fetched: 0, skipped: 0 };
  const quota = await getQuota(opts.budgetMb);
  if (quota.exceeds) {
    await purgeOldestTiles();
  }
  const cache = await caches.open(CACHE_NAME);
  const concurrency = opts.concurrency ?? 4;
  let fetched = 0;
  let skipped = 0;

  const all = plan.flatMap((p) =>
    p.tiles.map(({ z, x, y }) =>
      templateUrl
        .replace("{z}", String(z))
        .replace("{x}", String(x))
        .replace("{y}", String(y))
        .replace("{s}", "a"),
    ),
  );

  const queue = [...all];
  const workers: Promise<void>[] = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push((async () => {
      while (queue.length) {
        const url = queue.shift();
        if (!url) return;
        try {
          const existing = await cache.match(url);
          if (existing) { skipped++; continue; }
          const res = await fetch(url, { mode: "cors" });
          if (res.ok) {
            await cache.put(url, res.clone());
            fetched++;
          } else {
            skipped++;
          }
        } catch {
          skipped++;
        }
      }
    })());
  }
  await Promise.all(workers);
  return { fetched, skipped };
}

export async function purgeOldestTiles(keepRatio = 0.5): Promise<number> {
  if (typeof caches === "undefined") return 0;
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();
  const toDelete = Math.floor(requests.length * (1 - keepRatio));
  let deleted = 0;
  for (let i = 0; i < toDelete; i++) {
    if (await cache.delete(requests[i])) deleted++;
  }
  return deleted;
}

export async function clearOfflineTiles(): Promise<boolean> {
  if (typeof caches === "undefined") return false;
  return await caches.delete(CACHE_NAME);
}

/**
 * High-level entry — call once after login or periodically (idle).
 * Computes hot zones from visit history and prefetches a sensible budget.
 */
export async function smartPrefetch(
  templateUrl: string,
  opts: { budgetMb?: number; topN?: number } = {},
): Promise<{ zones: number; fetched: number; skipped: number }> {
  const visits = getVisits();
  if (visits.length === 0) return { zones: 0, fetched: 0, skipped: 0 };
  const zones = computeHotZones(visits, 0.02, opts.topN ?? 3);
  let fetched = 0;
  let skipped = 0;
  for (const z of zones) {
    const plan = buildPrefetchPlan(z);
    const r = await prefetchTiles(templateUrl, plan, { budgetMb: opts.budgetMb });
    fetched += r.fetched;
    skipped += r.skipped;
  }
  return { zones: zones.length, fetched, skipped };
}
