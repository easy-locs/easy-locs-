/**
 * import.notifications — Canonical import status notifications.
 * Covers: import started, completed, failed, partial summary.
 */
import { platformBus } from "@/lib/shared/platform-bus";

export type ImportStatus = "started" | "completed" | "failed" | "partial";

export interface ImportNotification {
  status: ImportStatus;
  sourceType: string;
  totalRows: number;
  successCount: number;
  failedCount: number;
  duplicateCount: number;
  errorDetails?: string;
}

export const ImportNotifications = {
  /** Emit import started event */
  notifyStarted(sourceType: string, totalRows: number) {
    platformBus.emit("import:started", { sourceType, totalRows, timestamp: new Date().toISOString() }, "import");
  },

  /** Emit import completed event */
  notifyCompleted(summary: Omit<ImportNotification, "status">) {
    const status: ImportStatus = summary.failedCount > 0 ? "partial" : "completed";
    platformBus.emit("import:completed", { ...summary, status, timestamp: new Date().toISOString() }, "import");
  },

  /** Emit import failed event */
  notifyFailed(sourceType: string, error: string) {
    platformBus.emit("import:failed", { sourceType, error, timestamp: new Date().toISOString() }, "import");
  },

  /** Build a human-readable summary */
  buildSummary(notification: ImportNotification): string {
    if (notification.status === "failed") {
      return `Import failed: ${notification.errorDetails || "Unknown error"}`;
    }
    const parts = [`${notification.successCount} imported`];
    if (notification.duplicateCount > 0) parts.push(`${notification.duplicateCount} duplicates skipped`);
    if (notification.failedCount > 0) parts.push(`${notification.failedCount} failed`);
    return parts.join(", ");
  },
};
