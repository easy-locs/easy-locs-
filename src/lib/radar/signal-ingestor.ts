/**
 * Radar Signal Ingestor — listens to existing eventBus events
 * and writes normalized signals to radar_signals table.
 *
 * Brain owner: Experience Brain
 * Phase: 1
 *
 * Consumed events (already emitted by existing handlers):
 * - entity.click           → view signal
 * - order.created          → commerce signal
 * - order.completed        → conversion signal
 * - message.sent           → communication signal
 * - wallet.updated         → payment signal
 * - search.performed       → search signal
 * - zone.pressure.updated  → zone intelligence signal
 * - zone.demand.updated    → demand signal
 * - listing.created        → supply signal
 * - listing.published      → supply signal
 */
import { eventBus } from "@/lib/core/event-bus";
import { supabase } from "@/integrations/supabase/client";

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

// ── Debounced batch writer ──
let batch: RawSignal[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const BATCH_SIZE = 20;
const FLUSH_INTERVAL_MS = 5000;

async function flushBatch() {
  if (batch.length === 0) return;
  const toFlush = [...batch];
  batch = [];

  const { error } = await supabase.from("radar_signals").insert(
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

// ── Event listeners ──

// Entity views / clicks
eventBus.on("entity.click", (p) => {
  enqueue({
    signal_type: "entity_view",
    source_module: "marketplace",
    entity_id: p.entityId as string,
    entity_type: "storefront",
    user_id: p.userId as string,
    intensity: 1,
    metadata_json: { action: "click" },
  });
});

// Orders
eventBus.on("order.created", (p) => {
  enqueue({
    signal_type: "order_created",
    source_module: "marketplace",
    entity_id: p.orderId as string,
    entity_type: "order",
    user_id: p.userId as string,
    intensity: 2,
    metadata_json: { shopId: p.shopId },
  });
});

eventBus.on("order.completed", (p) => {
  enqueue({
    signal_type: "order_completed",
    source_module: "marketplace",
    entity_id: p.orderId as string,
    entity_type: "order",
    user_id: p.userId as string,
    intensity: 3,
    metadata_json: { amount: p.amount },
  });
});

// Messages
eventBus.on("message.sent", (p) => {
  enqueue({
    signal_type: "message_sent",
    source_module: "orbit",
    user_id: p.userId as string,
    intensity: 1,
    metadata_json: { conversationId: p.conversationId },
  });
});

// Wallet
eventBus.on("wallet.updated", (p) => {
  enqueue({
    signal_type: "payment_activity",
    source_module: "wallet",
    user_id: p.userId as string,
    intensity: 2,
    metadata_json: { bridgedFrom: p._bridgedFrom },
  });
});

// Search
eventBus.on("search.performed", (p) => {
  enqueue({
    signal_type: "search_performed",
    source_module: "search",
    intensity: 1,
    metadata_json: { query: p.query },
  });
});

// Zone pressure (from zone-intelligence handler)
eventBus.on("zone.pressure.updated", (p) => {
  enqueue({
    signal_type: "zone_pressure",
    source_module: "execution",
    zone_key: p.zoneKey as string,
    intensity: ((p.pressureScore as number) ?? 0) / 100,
    metadata_json: {
      pressureScore: p.pressureScore,
      supplyLow: p.supply?.isLow,
      demandHigh: p.demand?.isHigh,
      trafficSevere: p.traffic?.isSevere,
    },
  });
});

// Zone demand
eventBus.on("zone.demand.updated", (p) => {
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
});

// Listings
eventBus.on("listing.created", (p) => {
  enqueue({
    signal_type: "listing_created",
    source_module: "marketplace",
    entity_id: p.listingId as string,
    entity_type: "listing",
    user_id: p.userId as string,
    intensity: 1,
  });
});

eventBus.on("listing.published", (p) => {
  enqueue({
    signal_type: "listing_published",
    source_module: "marketplace",
    entity_id: p.listingId as string,
    entity_type: "listing",
    user_id: p.userId as string,
    intensity: 2,
  });
});

if (import.meta.env.DEV) {
  console.log("[radar-ingestor] Signal ingestion active — 10 event sources connected");
}
