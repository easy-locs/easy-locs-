/**
 * orbitTelemetry.ts — Structured instrumentation for Orbit.
 * Records events for debugging and quality monitoring.
 * Persists critical events to orbit_telemetry_events table.
 * NEVER displays raw data to users — this is internal-only.
 */

import { supabase } from "@/integrations/supabase/client";

export type OrbitEventName =
  | "orbit.conversation.opened"
  | "orbit.conversation.created"
  | "orbit.message.sent"
  | "orbit.message.failed"
  | "orbit.message.received"
  | "orbit.call.started"
  | "orbit.call.ended"
  | "orbit.call.failed"
  | "orbit.contact.resolved"
  | "orbit.contact.unresolved"
  | "orbit.i18n.missing_key"
  | "orbit.ui.uuid_visible"
  | "orbit.data.unresolved_contact"
  | "orbit.notifications.mismatch"
  | "orbit.group.created"
  | "orbit.group.joined"
  | "orbit.presence.updated"
  | "orbit.attachment.sent"
  | "orbit.attachment.failed";

export interface OrbitEvent {
  name: OrbitEventName;
  screen: string;
  component: string;
  action: string;
  payload?: Record<string, unknown>;
  result: "success" | "failure" | "skipped";
  error?: string;
  timestamp: number;
}

const MAX_EVENTS = 200;
const _events: OrbitEvent[] = [];
const _subscribers = new Set<(events: OrbitEvent[]) => void>();

// Batch persistence: flush every 5s or 10 events
const _persistQueue: OrbitEvent[] = [];
let _flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 5000;
const FLUSH_THRESHOLD = 10;

// Events worth persisting (skip noisy ones)
const PERSIST_EVENTS = new Set<OrbitEventName>([
  "orbit.conversation.opened",
  "orbit.conversation.created",
  "orbit.message.sent",
  "orbit.message.failed",
  "orbit.call.started",
  "orbit.call.failed",
  "orbit.group.joined",
  "orbit.group.created",
  "orbit.ui.uuid_visible",
  "orbit.attachment.sent",
  "orbit.attachment.failed",
]);

async function flushTelemetry() {
  if (_persistQueue.length === 0) return;
  const batch = _persistQueue.splice(0, _persistQueue.length);
  try {
    const { data: sessionData } = await supabase.auth.getUser();
    const userId = sessionData?.user?.id || null;
    const rows = batch.map(e => ({
      event_name: e.name,
      screen: e.screen,
      component: e.component,
      action: e.action,
      result: e.result,
      payload: e.payload ? e.payload : null,
      error_message: e.error || null,
      user_id: userId,
      session_id: typeof window !== "undefined" ? window.sessionStorage?.getItem("orbit_session_id") || null : null,
    }));
    await (supabase as any).from("orbit_telemetry_events").insert(rows);
  } catch {
    // Silent fail — telemetry must never break the app
  }
}

function scheduleFlush() {
  if (_flushTimer) return;
  _flushTimer = setTimeout(() => {
    _flushTimer = null;
    flushTelemetry();
  }, FLUSH_INTERVAL);
}

/**
 * Record an Orbit telemetry event.
 * Safe to call from anywhere — never throws.
 */
export function trackOrbitEvent(
  name: OrbitEventName,
  details: {
    screen: string;
    component: string;
    action: string;
    payload?: Record<string, unknown>;
    result: "success" | "failure" | "skipped";
    error?: string;
  }
): void {
  const event: OrbitEvent = {
    name,
    ...details,
    timestamp: Date.now(),
  };

  _events.push(event);
  if (_events.length > MAX_EVENTS) _events.shift();

  // Dev logging
  if (import.meta.env.DEV) {
    const icon = event.result === "failure" ? "❌" : event.result === "skipped" ? "⏭️" : "✅";
    console.debug(`[Orbit] ${icon} ${event.name} — ${event.component}.${event.action}`, event.payload || "");
  }

  // Persist important events
  if (PERSIST_EVENTS.has(name)) {
    _persistQueue.push(event);
    if (_persistQueue.length >= FLUSH_THRESHOLD) {
      flushTelemetry();
    } else {
      scheduleFlush();
    }
  }

  _subscribers.forEach((fn) => fn([..._events]));
}

/** Subscribe to telemetry events (for admin cockpit) */
export function subscribeOrbitEvents(fn: (events: OrbitEvent[]) => void): () => void {
  _subscribers.add(fn);
  return () => _subscribers.delete(fn);
}

/** Get all recorded events */
export function getOrbitEvents(): OrbitEvent[] {
  return [..._events];
}

/** Clear all events */
export function clearOrbitEvents(): void {
  _events.length = 0;
  _subscribers.forEach((fn) => fn([]));
}

/** Check if a string looks like a raw UUID — use to detect leaks */
export function detectUuidLeak(text: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text.trim());
}

/** Guard: track if a UUID is about to be displayed */
export function guardDisplayName(
  value: string | null | undefined,
  fallback: string,
  context: { screen: string; component: string }
): string {
  if (!value) return fallback;
  if (detectUuidLeak(value)) {
    trackOrbitEvent("orbit.ui.uuid_visible", {
      screen: context.screen,
      component: context.component,
      action: "display_name_fallback",
      payload: { leakedPrefix: value.slice(0, 8) },
      result: "failure",
    });
    return fallback;
  }
  return value;
}
