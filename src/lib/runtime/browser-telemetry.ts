/**
 * browser-telemetry.ts — Real front-end telemetry engine.
 * Captures page views, runtime errors, dead clicks, action timeouts.
 * Buffers events and flushes to browser_telemetry_events + browser_front_incidents.
 */
import { supabase } from "@/integrations/supabase/client";

export type TelemetrySeverity = "info" | "warning" | "critical";
export type TelemetryEventType =
  | "page_view"
  | "route_dead"
  | "click_dead"
  | "action_started"
  | "action_success"
  | "action_timeout"
  | "action_failed"
  | "runtime_error"
  | "promise_rejection"
  | "blank_state_suspect"
  | "network_error"
  | "ui_warning";

export interface BrowserTelemetryPayload {
  sessionId: string;
  userId?: string | null;
  orgId?: string | null;
  pageUrl?: string | null;
  routeKey?: string | null;
  componentKey?: string | null;
  flowKey?: string | null;
  eventType: TelemetryEventType;
  severity?: TelemetrySeverity;
  actionKey?: string | null;
  status?: string | null;
  durationMs?: number | null;
  message?: string | null;
  errorStack?: string | null;
  metadata?: Record<string, unknown>;
}

export interface BrowserFrontIncidentPayload {
  sessionId: string;
  userId?: string | null;
  pageUrl?: string | null;
  routeKey?: string | null;
  componentKey?: string | null;
  flowKey?: string | null;
  issueType: string;
  severity?: TelemetrySeverity;
  title: string;
  summary?: string | null;
  metadata?: Record<string, unknown>;
}

const SESSION_KEY = "browser_runtime_session_id";
const FLUSH_DEBOUNCE_MS = 1200;
const EVENT_BUFFER_MAX = 20;
const INCIDENT_BUFFER_MAX = 10;

let eventBuffer: BrowserTelemetryPayload[] = [];
let incidentBuffer: BrowserFrontIncidentPayload[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function getBrowserRuntimeSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const value = `brs_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(SESSION_KEY, value);
  return value;
}

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    void flushBrowserTelemetry();
  }, FLUSH_DEBOUNCE_MS);
}

export function pushBrowserTelemetry(payload: BrowserTelemetryPayload) {
  eventBuffer.push(payload);
  if (eventBuffer.length >= EVENT_BUFFER_MAX) {
    void flushBrowserTelemetry();
    return;
  }
  scheduleFlush();
}

export function pushBrowserFrontIncident(payload: BrowserFrontIncidentPayload) {
  incidentBuffer.push(payload);
  if (incidentBuffer.length >= INCIDENT_BUFFER_MAX) {
    void flushBrowserTelemetry();
    return;
  }
  scheduleFlush();
}

export async function flushBrowserTelemetry(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const events = [...eventBuffer];
  const incidents = [...incidentBuffer];
  eventBuffer = [];
  incidentBuffer = [];

  try {
    if (events.length > 0) {
      await (supabase as any).from("browser_telemetry_events").insert(
        events.map((e) => ({
          session_id: e.sessionId,
          user_id: e.userId ?? null,
          org_id: e.orgId ?? null,
          page_url: e.pageUrl ?? (typeof window !== "undefined" ? window.location.href : null),
          route_key: e.routeKey ?? null,
          component_key: e.componentKey ?? null,
          flow_key: e.flowKey ?? null,
          event_type: e.eventType,
          severity: e.severity ?? "info",
          action_key: e.actionKey ?? null,
          status: e.status ?? null,
          duration_ms: e.durationMs ?? null,
          message: e.message ?? null,
          error_stack: e.errorStack ?? null,
          metadata_json: e.metadata ?? {},
        })),
      );
    }

    if (incidents.length > 0) {
      for (const inc of incidents) {
        const { data: existing } = await (supabase as any)
          .from("browser_front_incidents")
          .select("id, hit_count")
          .eq("session_id", inc.sessionId)
          .eq("route_key", inc.routeKey ?? "")
          .eq("flow_key", inc.flowKey ?? "")
          .eq("issue_type", inc.issueType)
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing?.id) {
          await (supabase as any)
            .from("browser_front_incidents")
            .update({
              updated_at: new Date().toISOString(),
              last_seen_at: new Date().toISOString(),
              hit_count: (existing.hit_count ?? 0) + 1,
              summary: inc.summary ?? null,
              metadata_json: inc.metadata ?? {},
            })
            .eq("id", existing.id);
        } else {
          await (supabase as any).from("browser_front_incidents").insert({
            session_id: inc.sessionId,
            user_id: inc.userId ?? null,
            page_url: inc.pageUrl ?? (typeof window !== "undefined" ? window.location.href : null),
            route_key: inc.routeKey ?? null,
            component_key: inc.componentKey ?? null,
            flow_key: inc.flowKey ?? null,
            issue_type: inc.issueType,
            severity: inc.severity ?? "warning",
            title: inc.title,
            summary: inc.summary ?? null,
            metadata_json: inc.metadata ?? {},
          });
        }
      }
    }
  } catch (err) {
    console.error("[browser-telemetry] flush failed", err);
  }
}
