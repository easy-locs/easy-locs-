/**
 * Map performance telemetry — instruments FPS and tile load times, exposing
 * a rolling budget report used by the observability dashboard.
 *
 * Designed to be cheap (no per-frame allocations beyond a counter) and safe
 * to attach to any MapLibre instance.
 */
import type maplibregl from "maplibre-gl";
import { structuredLogger } from "@/lib/observability/structured-logger";

interface FpsMonitor {
  stop: () => void;
  current: () => number;
}

interface TileLoadStats {
  count: number;
  totalMs: number;
  maxMs: number;
}

export interface PerformanceBudgetReport {
  fps: number;
  fpsMin: number;
  tileLoadCount: number;
  tileLoadAvgMs: number;
  tileLoadMaxMs: number;
  withinBudget: boolean;
  budget: { minFps: number; maxTileMs: number };
}

const DEFAULT_BUDGET = { minFps: 50, maxTileMs: 350 };
const MAP_TELEMETRY: WeakMap<maplibregl.Map, {
  monitor: FpsMonitor;
  fpsHistory: number[];
  tile: TileLoadStats;
  flushTimer: ReturnType<typeof setInterval> | null;
}> = new WeakMap();

function startFpsMonitor(): FpsMonitor {
  let frames = 0;
  let lastReport = performance.now();
  let currentFps = 60;
  let raf: number | null = null;
  const tick = () => {
    frames++;
    const now = performance.now();
    if (now - lastReport >= 1000) {
      currentFps = (frames * 1000) / (now - lastReport);
      frames = 0;
      lastReport = now;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return {
    stop: () => { if (raf !== null) cancelAnimationFrame(raf); },
    current: () => currentFps,
  };
}

export function attachPerformanceTelemetry(
  map: maplibregl.Map,
  opts: {
    budget?: { minFps?: number; maxTileMs?: number };
    flushIntervalMs?: number;
    onReport?: (r: PerformanceBudgetReport) => void;
  } = {},
): () => void {
  if (MAP_TELEMETRY.has(map)) {
    detachPerformanceTelemetry(map);
  }
  const budget = {
    minFps: opts.budget?.minFps ?? DEFAULT_BUDGET.minFps,
    maxTileMs: opts.budget?.maxTileMs ?? DEFAULT_BUDGET.maxTileMs,
  };
  const monitor = startFpsMonitor();
  const fpsHistory: number[] = [];
  const tile: TileLoadStats = { count: 0, totalMs: 0, maxMs: 0 };
  const tileStarts = new Map<string, number>();

  const onDataLoading = (e: maplibregl.MapDataEvent) => {
    if (e.dataType !== "source") return;
    const tile = (e as unknown as { tile?: { tileID?: { key?: string } } }).tile;
    const key = tile?.tileID?.key;
    if (key) tileStarts.set(key, performance.now());
  };
  const onData = (e: maplibregl.MapDataEvent) => {
    if (e.dataType !== "source") return;
    const t = (e as unknown as { tile?: { tileID?: { key?: string } } }).tile;
    const key = t?.tileID?.key;
    if (!key) return;
    const start = tileStarts.get(key);
    if (start === undefined) return;
    tileStarts.delete(key);
    const elapsed = performance.now() - start;
    tile.count++;
    tile.totalMs += elapsed;
    if (elapsed > tile.maxMs) tile.maxMs = elapsed;
  };

  map.on("dataloading", onDataLoading as unknown as (e: unknown) => void);
  map.on("data", onData as unknown as (e: unknown) => void);

  const flushIntervalMs = opts.flushIntervalMs ?? 10_000;
  const flushTimer = setInterval(() => {
    fpsHistory.push(monitor.current());
    if (fpsHistory.length > 60) fpsHistory.shift();
    const fpsAvg = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;
    const fpsMin = Math.min(...fpsHistory);
    const tileAvg = tile.count > 0 ? tile.totalMs / tile.count : 0;
    const report: PerformanceBudgetReport = {
      fps: Math.round(fpsAvg * 10) / 10,
      fpsMin: Math.round(fpsMin * 10) / 10,
      tileLoadCount: tile.count,
      tileLoadAvgMs: Math.round(tileAvg),
      tileLoadMaxMs: Math.round(tile.maxMs),
      withinBudget: fpsAvg >= budget.minFps && tileAvg <= budget.maxTileMs,
      budget,
    };
    try {
      structuredLogger.info("map.performance", {
        fps: report.fps,
        fpsMin: report.fpsMin,
        tileAvgMs: report.tileLoadAvgMs,
        tileMaxMs: report.tileLoadMaxMs,
        tilesLoaded: report.tileLoadCount,
        withinBudget: report.withinBudget,
      });
    } catch {}
    opts.onReport?.(report);
    tile.count = 0; tile.totalMs = 0; tile.maxMs = 0;
  }, flushIntervalMs);

  MAP_TELEMETRY.set(map, { monitor, fpsHistory, tile, flushTimer });

  return () => detachPerformanceTelemetry(map);
}

export function detachPerformanceTelemetry(map: maplibregl.Map) {
  const entry = MAP_TELEMETRY.get(map);
  if (!entry) return;
  entry.monitor.stop();
  if (entry.flushTimer) clearInterval(entry.flushTimer);
  MAP_TELEMETRY.delete(map);
}

/**
 * One-shot snapshot for ad-hoc dashboards (e.g. dev overlay).
 */
export function snapshotPerformance(map: maplibregl.Map): PerformanceBudgetReport | null {
  const entry = MAP_TELEMETRY.get(map);
  if (!entry) return null;
  const fps = entry.monitor.current();
  const tileAvg = entry.tile.count > 0 ? entry.tile.totalMs / entry.tile.count : 0;
  return {
    fps: Math.round(fps * 10) / 10,
    fpsMin: Math.round(fps * 10) / 10,
    tileLoadCount: entry.tile.count,
    tileLoadAvgMs: Math.round(tileAvg),
    tileLoadMaxMs: Math.round(entry.tile.maxMs),
    withinBudget: fps >= DEFAULT_BUDGET.minFps && tileAvg <= DEFAULT_BUDGET.maxTileMs,
    budget: DEFAULT_BUDGET,
  };
}
