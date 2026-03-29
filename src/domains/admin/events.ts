/**
 * Admin Domain — Event adapter.
 */
import { publishDomainEvent, createDomainEvent } from "../shared/domain-event-bus";
import type { AdminEventPort, AdminAlert } from "./ports";

export const adminEvents: AdminEventPort = {
  alertCreated(alert: AdminAlert) {
    publishDomainEvent(
      createDomainEvent("admin:alert_created", alert.id, "admin_alert", {
        alertType: alert.alertType, severity: alert.severity, title: alert.title,
      }, "admin")
    );
  },

  alertResolved(alertId: string) {
    publishDomainEvent(
      createDomainEvent("admin:alert_resolved", alertId, "admin_alert", {}, "admin")
    );
  },
};
