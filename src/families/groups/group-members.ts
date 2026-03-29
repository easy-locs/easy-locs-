/**
 * group.members — Canonical group member management.
 */

export type GroupRole = "admin" | "member" | "moderator";

export interface GroupMember {
  userId: string;
  orbitId?: string;
  displayName?: string;
  avatarUrl?: string;
  role: GroupRole;
  joinedAt?: string;
}

export const GroupMembers = {
  /** Check if user is admin */
  isAdmin(members: GroupMember[], userId: string): boolean {
    return members.some((m) => m.userId === userId && m.role === "admin");
  },

  /** Check if user is member */
  isMember(members: GroupMember[], userId: string): boolean {
    return members.some((m) => m.userId === userId);
  },

  /** Get member role */
  getRole(members: GroupMember[], userId: string): GroupRole | null {
    return members.find((m) => m.userId === userId)?.role || null;
  },

  /** Add member to participants array */
  addMember(members: GroupMember[], userId: string, role: GroupRole = "member"): GroupMember[] {
    if (GroupMembers.isMember(members, userId)) return members;
    return [...members, { userId, role }];
  },

  /** Remove member from participants */
  removeMember(members: GroupMember[], userId: string): GroupMember[] {
    return members.filter((m) => m.userId !== userId);
  },

  /** Promote to admin */
  promoteToAdmin(members: GroupMember[], userId: string): GroupMember[] {
    return members.map((m) => (m.userId === userId ? { ...m, role: "admin" as GroupRole } : m));
  },

  /** Demote from admin */
  demoteFromAdmin(members: GroupMember[], userId: string): GroupMember[] {
    return members.map((m) => (m.userId === userId ? { ...m, role: "member" as GroupRole } : m));
  },

  /** Get admin count */
  getAdminCount(members: GroupMember[]): number {
    return members.filter((m) => m.role === "admin").length;
  },
};
