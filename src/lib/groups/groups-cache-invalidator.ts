/**
 * groups-cache-invalidator — Cache sync for groups/channels/communities.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";
import { queryClient } from "@/lib/query-client";

const GROUP_QUERY_KEYS = [
  "groups", "group-members", "group-messages", "channels", "communities",
] as const;

export function invalidateGroupCaches() {
  for (const key of GROUP_QUERY_KEYS) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}

export function installGroupCacheListeners(): () => void {
  const unsubs = [
    platformBus.on(APP_EVENTS.GROUP_CREATED as any, () => invalidateGroupCaches()),
    platformBus.on(APP_EVENTS.GROUP_MESSAGE_SENT as any, () => invalidateGroupCaches()),
    platformBus.on(APP_EVENTS.CHANNEL_UPDATED as any, () => invalidateGroupCaches()),
  ];
  return () => unsubs.forEach(u => u());
}
