/**
 * notification-writer — Atomic unit: dispatch a single notification.
 * Single responsibility: write one notification via canonical insertNotification() + emit event.
 *
 * C3 fix: Now delegates to the canonical notification-service instead of direct DB insert,
 * ensuring all notification paths go through a single write layer.
 */
import { insertNotification } from "@/lib/notification-service/notification-service";
import { reportHealth } from "@/lib/runtime/health-aggregator";
import { platformBus } from "@/lib/shared/platform-bus";
import { trackPropagation } from "@/lib/runtime/propagation-validator";
import { APP_EVENTS } from "@/lib/platform/events";

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

const severityToPriority: Record<string, "low" | "normal" | "high" | "critical"> = {
  info: "normal",
  success: "normal",
  warning: "high",
  error: "critical",
};

export async function dispatchNotification(input: NotificationInput): Promise<NotificationResult> {
  trace("dispatch", "input", { userId: input.userId, title: input.title, category: input.category });
  const start = Date.now();

  try {
    const notificationId = await insertNotification({
      user_id: input.userId,
      actor: "system",
      domain: "system",
      type: input.category,
      title: input.title,
      body: input.body ?? "",
      priority: severityToPriority[input.severity ?? "info"] ?? "normal",
      action_url: input.route ?? undefined,
      data: {
        entity_id: input.entityId ?? null,
        entity_type: input.entityType ?? null,
        icon: input.icon ?? null,
      },
    });

    const latency = Date.now() - start;
    if (!notificationId) {
      trace("dispatch", "error", { message: "insertNotification returned null", latency });
      reportHealth("notifications", "degraded", latency, "insertNotification returned null");
      return { success: false, error: "insertNotification returned null" };
    }

    trace("dispatch", "output", { notificationId, latency });
    reportHealth("notifications", "ok", latency);

    platformBus.emit(APP_EVENTS.NOTIFICATIONS_REFRESH, { userId: input.userId }, "notifications");

    trackPropagation({
      flowId: `notif-${notificationId}`, domain: "notifications", action: "dispatch",
      dbWriteSuccess: true, eventEmitted: APP_EVENTS.NOTIFICATIONS_REFRESH, cacheInvalidated: [],
    });

    return { success: true, notificationId };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    trace("dispatch", "error", { message: msg });
    reportHealth("notifications", "down", undefined, msg);
    return { success: false, error: msg };
  }
}
