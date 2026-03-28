/**
 * Group helpers — formatting, icons, labels.
 */
import { UsersRound, Hash, Globe } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import type { GroupType, MemberRole } from "./types";

export function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

export function formatMsgTime(d: string): string {
  const date = new Date(d);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "dd/MM");
}

export const TYPE_ICONS: Record<GroupType, typeof UsersRound> = {
  group: UsersRound,
  channel: Hash,
  community: Globe,
};

export const TYPE_LABELS: Record<GroupType, string> = {
  group: "Group",
  channel: "Channel",
  community: "Community",
};

export const ROLE_LABELS: Record<MemberRole, string> = {
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};
