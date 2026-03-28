/**
 * notification-dispatcher-v2 — Atomic unit: dispatch a single notification.
 * Single responsibility: write one notification to DB + emit event.
 */
import { supabase } from "@/integrations/supabase/client";
import { reportHealth } from "@/lib/runtime/health-aggregator";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[NOTIFICATIONS][${step}] ${phase}:`, payload ?? {});
};

export interface NotificationInput {
  userId: string;
  title: string;
  body?: string;
  category: string;
  severity?: "info" | "warning" | "error" | "success";
  route?: string;
  entityId?: string;
  entityType?: string;
  icon?: string;
}

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  error?: string;
}

export async function dispatchNotification(input: NotificationInput): Promise<NotificationResult> {
  trace("dispatch", "input", { userId: input.userId, title: input.title, category: input.category });
  const start = Date.now();

  try {
    const { data, error } = await supabase
      .from("app_notifications")
      .insert({
        user_id: input.userId,
        title: input.title,
        body: input.body ?? null,
        category: input.category,
        severity: input.severity ?? "info",
        route: input.route ?? null,
        entity_id: input.entityId ?? null,
        entity_type: input.entityType ?? null,
        icon: input.icon ?? null,
        scope: "app",
        metadata: {},
      })
      .select("id")
      .single();

    const latency = Date.now() - start;
    if (error) {
      trace("dispatch", "error", { message: error.message, latency });
      reportHealth("notifications", "degraded", latency, error.message);
      return { success: false, error: error.message };
    }

    trace("dispatch", "output", { notificationId: data?.id, latency });
    reportHealth("notifications", "ok", latency);
    return { success: true, notificationId: data?.id };
  } catch (err: any) {
    trace("dispatch", "error", { message: err.message });
    reportHealth("notifications", "down", undefined, err.message);
    return { success: false, error: err.message };
  }
}
