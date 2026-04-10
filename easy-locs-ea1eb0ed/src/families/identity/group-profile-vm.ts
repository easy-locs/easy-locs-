/**
 * GroupProfileViewModel — Canonical view model for group info screens.
 */
import type { GroupMember } from "@/families/groups/group-members";

export interface GroupProfileViewModel {
  groupId: string;
  title: string;
  description: string;
  avatarUrl: string | null;
  initials: string;
  memberCount: number;
  members: GroupMemberViewModel[];
  createdAt: string;
  createdByName: string;
  isAdmin: boolean;
  canEdit: boolean;
  canAddMembers: boolean;
  canLeave: boolean;
}

export interface GroupMemberViewModel {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  initials: string;
  role: string;
  isAdmin: boolean;
  isMe: boolean;
}

export function buildGroupProfileVM(params: {
  groupId: string;
  title?: string;
  description?: string;
  avatarUrl?: string | null;
  createdAt?: string;
  createdByName?: string;
  members: GroupMember[];
  currentUserId: string | null;
}): GroupProfileViewModel {
  const { groupId, members, currentUserId } = params;
  const title = params.title || "Group";
  const initials = title.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "G";
  const isAdmin = members.some(m => m.userId === currentUserId && m.role === "admin");

  return {
    groupId,
    title,
    description: params.description || "",
    avatarUrl: params.avatarUrl || null,
    initials,
    memberCount: members.length,
    members: members.map(m => ({
      userId: m.userId,
      displayName: m.displayName || "Member",
      avatarUrl: m.avatarUrl || null,
      initials: (m.displayName || "M").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase(),
      role: m.role,
      isAdmin: m.role === "admin",
      isMe: m.userId === currentUserId,
    })),
    createdAt: params.createdAt || "",
    createdByName: params.createdByName || "Unknown",
    isAdmin,
    canEdit: isAdmin,
    canAddMembers: isAdmin,
    canLeave: !isAdmin || members.filter(m => m.role === "admin").length > 1,
  };
}
