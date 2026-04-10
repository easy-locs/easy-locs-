/**
 * group.events — Canonical group system event messages.
 */
import { sendSystemEvent } from "@/families/send/send-system-event";
import type { SendContext } from "@/families/send/send-context";

export type GroupEventType =
  | "member_added"
  | "member_removed"
  | "member_left"
  | "admin_changed"
  | "title_changed"
  | "avatar_changed"
  | "group_created"
  | "settings_changed";

export const GroupEvents = {
  /** Send a group system event into the thread */
  async send(
    ctx: SendContext,
    eventType: GroupEventType,
    body: string,
    metadata?: Record<string, unknown>,
  ) {
    return sendSystemEvent(ctx, eventType, body, {
      group_event: true,
      ...metadata,
    });
  },

  /** Build event body text */
  buildBody(eventType: GroupEventType, actorName: string, targetName?: string): string {
    switch (eventType) {
      case "member_added":
        return `${actorName} added ${targetName || "a member"}`;
      case "member_removed":
        return `${actorName} removed ${targetName || "a member"}`;
      case "member_left":
        return `${actorName} left the group`;
      case "admin_changed":
        return `${actorName} changed admin for ${targetName || "a member"}`;
      case "title_changed":
        return `${actorName} changed the group name`;
      case "avatar_changed":
        return `${actorName} changed the group photo`;
      case "group_created":
        return `${actorName} created this group`;
      case "settings_changed":
        return `${actorName} changed group settings`;
      default:
        return `${actorName} updated the group`;
    }
  },
};
