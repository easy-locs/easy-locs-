import { platformBus } from "@/lib/shared/platform-bus";

export function triggerGlobalRefresh(source: string) {
  const meta = { source, at: new Date().toISOString() };

  platformBus.emit("dashboard:refresh", meta, "system");
  platformBus.emit("system:sync_completed", meta, "system");
}
