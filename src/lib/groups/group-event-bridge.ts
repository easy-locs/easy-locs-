/**
 * group-event-bridge — Canonical events for groups/channels/communities.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { trackPropagation } from "@/lib/runtime/propagation-validator";

export function emitGroupCreated(groupId: string) {
  platformBus.emit("orbit:group_created", { groupId }, "groups");
  platformBus.emit("dashboard:counters_refresh", {}, "groups");
  trackPropagation({
    flowId: `group-created-${groupId}`,
    domain: "orbit",
    action: "group_created",
    dbWriteSuccess: true,
    eventEmitted: "orbit:group_created",
    cacheInvalidated: ["orbit-groups"],
  });
}

export function emitGroupMessageSent(groupId: string, messageId: string) {
  platformBus.emit("orbit:group_message_sent", { groupId, messageId }, "groups");
  platformBus.emit("notifications:refresh", {}, "groups");
  trackPropagation({
    flowId: `group-msg-${messageId}`,
    domain: "orbit",
    action: "group_message_sent",
    dbWriteSuccess: true,
    eventEmitted: "orbit:group_message_sent",
    cacheInvalidated: ["orbit-groups", "orbit-unread"],
  });
}

export function emitGroupMemberAdded(groupId: string, userId: string) {
  platformBus.emit("orbit:group_member_added", { groupId, userId }, "groups");
  platformBus.emit("notifications:refresh", {}, "groups");
  trackPropagation({
    flowId: `group-member-${groupId}-${userId}`,
    domain: "orbit",
    action: "member_added",
    dbWriteSuccess: true,
    eventEmitted: "orbit:group_member_added",
    cacheInvalidated: ["orbit-groups"],
  });
}
