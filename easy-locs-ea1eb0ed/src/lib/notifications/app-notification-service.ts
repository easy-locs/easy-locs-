/**
 * app-notification-service — SSOT adapter.
 * All writes delegate to the canonical notification-service (notification-service path).
 * Do NOT add direct Supabase calls here; use insertNotification() only.
 */
import {
  insertNotification,
  markAsRead,
  dismissNotification as svcDismiss,
} from "@/lib/notification-service/notification-service";

export type AppNotificationInput = {
  userId: string;
  scope?: "global" | "orbit" | "wallet" | "dashboard" | "booking" | "radar";
  category?: string;
  title: string;
  body?: string;
  route?: string;
  icon?: string;
  severity?: "info" | "success" | "warning" | "critical";
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export async function createAppNotification(input: AppNotificationInput) {
  await insertNotification({
    user_id: input.userId,
    actor: "system",
    domain: (input.scope as any) ?? "system",
    type: input.category ?? "general",
    title: input.title,
    body: input.body ?? "",
    priority: input.severity === "critical" ? "critical"
      : input.severity === "warning" ? "high"
      : "normal",
    action_url: input.route ?? undefined,
    data: {
      icon: input.icon ?? null,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      ...(input.metadata ?? {}),
    },
  });
}

export async function markNotificationRead(notificationId: string) {
  await markAsRead(notificationId);
}

export async function dismissNotification(notificationId: string) {
  await svcDismiss(notificationId);
}
