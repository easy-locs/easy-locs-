/**
 * Radar Signal Ingestor — listens to canonical platformBus events
 * and writes normalized signals to radar_signals table.
 *
 * Brain owner: Experience Brain
 * Phase: 1
 *
 * Consumed events (colon notation via platformBus):
 * - entity:click           → view signal
 * - order:created          → commerce signal
 * - order:completed        → conversion signal
 * - orbit:message_sent     → communication signal
 * - wallet:balance_refresh → payment signal
 * - wallet:updated         → payment signal (legacy compat)
 * - search:performed       → search signal
 * - zone:pressure_updated  → zone intelligence signal
 * - zone:demand_updated    → demand signal
 * - listing:created        → supply signal
 * - listing:published      → supply signal
 */
import { platformBus, type PlatformEvent } from "@/lib/shared/platform-bus";
import { db } from "@/services/db";

interface RawSignal {
  signal_type: string;
  source_module: string;
  entity_id?: string;
  entity_type?: string;
  zone_key?: string;
  city?: string;
  country?: string;
  user_id?: string;
  lat?: number;
  lng?: number;
  intensity?: number;
  metadata_json?: Record<string, unknown>;
}

let batch: RawSignal[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const BATCH_SIZE = 20;
const FLUSH_INTERVAL_MS = 5000;

async function flushBatch() {
  if (batch.length === 0) return;
  const toFlush = [...batch];
  batch = [];

  const { error } = await db("radar_signals").insert(
    toFlush.map((s) => ({
      signal_type: s.signal_type,
      source_module: s.source_module,
      entity_id: s.entity_id ?? null,
      entity_type: s.entity_type ?? null,
      zone_key: s.zone_key ?? null,
      city: s.city ?? null,
      country: s.country ?? null,
      user_id: s.user_id ?? null,
      lat: s.lat ?? null,
      lng: s.lng ?? null,
      intensity: s.intensity ?? 1,
      metadata_json: s.metadata_json ?? {},
    })),
  );

  if (error && import.meta.env.DEV) {
    console.warn("[radar-ingestor] flush error", error.message);
  }
}

function enqueue(signal: RawSignal) {
  batch.push(signal);
  if (batch.length >= BATCH_SIZE) {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = null;
    void flushBatch();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushBatch();
    }, FLUSH_INTERVAL_MS);
  }
}

const _unsubs: Array<() => void> = [];

_unsubs.push(platformBus.on("entity:click", (event: PlatformEvent) => {
  const p = event.payload as Record<string, unknown>;
  enqueue({
    signal_type: "entity_view",
    source_module: "marketplace",
    entity_id: p.entityId as string,
    entity_type: "storefront",
    user_id: p.userId as string,
    intensity: 1,
    metadata_json: { action: "click" },
  });
}));

_unsubs.push(platformBus.on("order:created", (event: PlatformEvent) => {
  const p = event.payload as Record<string, unknown>;
  enqueue({
    signal_type: "order_created",
    source_module: "marketplace",
    entity_id: p.orderId as string,
    entity_type: "order",
    user_id: p.userId as string,
    intensity: 2,
    metadata_json: { shopId: p.shopId },
  });
}));

_unsubs.push(platformBus.on("order:completed", (event: PlatformEvent) => {
  const p = event.payload as Record<string, unknown>;
  enqueue({
    signal_type: "order_completed",
    source_module: "marketplace",
    entity_id: p.orderId as string,
    entity_type: "order",
    user_id: p.userId as string,
    intensity: 3,
    metadata_json: { amount: p.amount },
  });
}));

_unsubs.push(platformBus.on("orbit:message_sent", (event: PlatformEvent) => {
  const p = event.payload as Record<string, unknown>;
  enqueue({
    signal_type: "message_sent",
    source_module: "orbit",
    user_id: p.userId as string,
    intensity: 1,
    metadata_json: { conversationId: p.conversationId },
  });
}));

_unsubs.push(platformBus.on("wallet:balance_refresh", (event: PlatformEvent) => {
  const p = event.payload as Record<string, unknown>;
  enqueue({
    signal_type: "payment_activity",
    source_module: "wallet",
    user_id: p.userId as string,
    intensity: 2,
    metadata_json: { bridgedFrom: p._bridgedFrom },
  });
}));

_unsubs.push(platformBus.on("wallet:updated", (event: PlatformEvent) => {
  const p = event.payload as Record<string, unknown>;
  enqueue({
    signal_type: "payment_activity",
    source_module: "wallet",
    user_id: p.userId as string,
    intensity: 2,
    metadata_json: { bridgedFrom: p._bridgedFrom },
  });
}));

_unsubs.push(platformBus.on("search:performed", (event: PlatformEvent) => {
  const p = event.payload as Record<string, unknown>;
  enqueue({
    signal_type: "search_performed",
    source_module: "search",
    intensity: 1,
    metadata_json: { query: p.query },
  });
}));

_unsubs.push(platformBus.on("zone:pressure_updated", (event: PlatformEvent) => {
  const p = event.payload as Record<string, unknown>;
  const supply = p.supply as Record<string, unknown> | undefined;
  const demand = p.demand as Record<string, unknown> | undefined;
  const traffic = p.traffic as Record<string, unknown> | undefined;
  enqueue({
    signal_type: "zone_pressure",
    source_module: "execution",
    zone_key: p.zoneKey as string,
    intensity: ((p.pressureScore as number) ?? 0) / 100,
    metadata_json: {
      pressureScore: p.pressureScore,
      supplyLow: supply?.isLow,
      demandHigh: demand?.isHigh,
      trafficSevere: traffic?.isSevere,
    },
  });
}));

_unsubs.push(platformBus.on("zone:demand_updated", (event: PlatformEvent) => {
  const p = event.payload as Record<string, unknown>;
  if (p.isHigh) {
    enqueue({
      signal_type: "demand_spike",
      source_module: "execution",
      zone_key: p.zoneKey as string,
      intensity: (p.multiplier as number) ?? 1,
      metadata_json: {
        level: p.level,
        surgeActive: p.surgeActive,
        surgeMultiplier: p.surgeMultiplier,
      },
    });
  }
}));

_unsubs.push(platformBus.on("listing:created", (event: PlatformEvent) => {
  const p = event.payload as Record<string, unknown>;
  enqueue({
    signal_type: "listing_created",
    source_module: "marketplace",
    entity_id: p.listingId as string,
    entity_type: "listing",
    user_id: p.userId as string,
    intensity: 1,
  });
}));

_unsubs.push(platformBus.on("listing:published", (event: PlatformEvent) => {
  const p = event.payload as Record<string, unknown>;
  enqueue({
    signal_type: "listing_published",
    source_module: "marketplace",
    entity_id: p.listingId as string,
    entity_type: "listing",
    user_id: p.userId as string,
    intensity: 2,
  });
}));

if (import.meta.env.DEV) {
  console.log("[radar-ingestor] Signal ingestion active — 12 event sources connected (platformBus)");
}
