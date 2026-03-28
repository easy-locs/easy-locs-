/**
 * realtime-intelligence — Smart realtime with throttling, reconnection, health tracking.
 * Replaces dumb "subscribe to everything" with intelligent channel management.
 */
import { supabase } from "@/integrations/supabase/client";
import { registerChannel, recordEvent, unregisterChannel, checkStaleness } from "./realtime-monitor";
import { reportHealth } from "./health-aggregator";

type ThrottleConfig = {
  minIntervalMs: number;
  maxBatchSize: number;
};

const DEFAULT_THROTTLE: ThrottleConfig = { minIntervalMs: 250, maxBatchSize: 10 };

interface SmartChannelConfig {
  channelName: string;
  domain: string;
  table: string;
  event: "INSERT" | "UPDATE" | "DELETE" | "*";
  filter?: string;
  onEvent: (payload: any) => void;
  throttle?: Partial<ThrottleConfig>;
}

/**
 * Create a smart realtime channel with throttling and health tracking.
 */
export function createSmartChannel(config: SmartChannelConfig): () => void {
  const { channelName, domain, table, event, filter, onEvent, throttle } = config;
  const throttleConfig = { ...DEFAULT_THROTTLE, ...throttle };

  registerChannel(channelName, domain);

  let pendingEvents: any[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let lastFlushAt = 0;

  function flush() {
    if (pendingEvents.length === 0) return;
    const batch = pendingEvents.splice(0, throttleConfig.maxBatchSize);
    lastFlushAt = Date.now();

    for (const payload of batch) {
      try {
        onEvent(payload);
      } catch (e) {
        console.error(`[realtime-intelligence] ${channelName} handler error:`, e);
      }
    }

    // If more pending, schedule next flush
    if (pendingEvents.length > 0) {
      flushTimer = setTimeout(flush, throttleConfig.minIntervalMs);
    }
  }

  const subscriptionConfig: any = { event, schema: "public", table };
  if (filter) subscriptionConfig.filter = filter;

  const channel = supabase
    .channel(channelName)
    .on("postgres_changes" as any, subscriptionConfig, (payload: any) => {
      recordEvent(channelName);
      reportHealth(domain, "ok");
      pendingEvents.push(payload.new ?? payload);

      const timeSinceFlush = Date.now() - lastFlushAt;
      if (timeSinceFlush >= throttleConfig.minIntervalMs) {
        flush();
      } else if (!flushTimer) {
        flushTimer = setTimeout(flush, throttleConfig.minIntervalMs - timeSinceFlush);
      }
    })
    .subscribe();

  return () => {
    if (flushTimer) clearTimeout(flushTimer);
    unregisterChannel(channelName);
    supabase.removeChannel(channel);
  };
}

/**
 * Periodic realtime health check — detect stale channels.
 */
export function startRealtimeHealthCheck(intervalMs = 30_000): () => void {
  const timer = setInterval(() => {
    const stale = checkStaleness();
    if (stale.length > 0) {
      reportHealth("realtime", "degraded", undefined, `${stale.length} stale channels`);
    } else {
      reportHealth("realtime", "ok");
    }
  }, intervalMs);

  return () => clearInterval(timer);
}
