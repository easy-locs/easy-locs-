/**
 * Analytics domain orchestration handlers.
 * Single responsibility: user activity events → log only.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { logOrchestrationEvent } from "../logger";
import type { UserOpenHomePayload, UserSearchPayload } from "../eventTypes";

export function installAnalyticsHandlers(): void {
  platformBus.on("USER_OPEN_HOME", async (event) => {
    const p = event.payload as UserOpenHomePayload;
    await logOrchestrationEvent({ eventType: "orch_user_open_home", entityId: p.userId ?? "anonymous", entityType: "user_session", metadata: p as any });
  });

  platformBus.on("USER_SEARCH", async (event) => {
    const p = event.payload as UserSearchPayload;
    await logOrchestrationEvent({ eventType: "orch_user_search", entityId: p.userId ?? "anonymous", entityType: "search", metadata: p as any });
  });
}
