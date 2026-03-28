/**
 * useGroupMembers — Atomic: member CRUD for Orbit groups.
 */
import { useState, useCallback } from "react";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import * as groupsRepo from "@/repositories/groups.repository";

type MemberRole = "admin" | "member" | "viewer";

export interface GroupMember {
  id: string; user_id: string; role: MemberRole; joined_at: string; profile_name?: string;
}

const ROLE_LABELS: Record<MemberRole, string> = { admin: "Admin", member: "Member", viewer: "Viewer" };

export function useGroupMembers(userId: string | undefined) {
  const [members, setMembers] = useState<GroupMember[]>([]);

  const refreshMembers = useCallback(async (groupId: string) => {
    const data = await groupsRepo.fetchGroupMembers(groupId);
    setMembers((data as GroupMember[]) || []);
  }, []);

  const addMember = useCallback(async (groupId: string, email: string, role: MemberRole) => {
    const normalizedEmail = email.trim().toLowerCase();
    const profile = await groupsRepo.fetchProfileByEmail(normalizedEmail);
    if (!profile) { toast.error("User not found"); return false; }

    const orbitProfile = await groupsRepo.fetchOrbitProfile(profile.id);
    const currentConv = await groupsRepo.fetchConversationParticipants(groupId);
    if (!currentConv) return false;

    const participants = Array.isArray(currentConv?.participants) ? [...currentConv.participants] : [];
    if (participants.some((p: any) => p?.userId === profile.id || p?.user_id === profile.id)) { toast.info("Already a member"); return false; }

    participants.push({ userId: profile.id, orbitId: orbitProfile?.orbit_id || null, displayName: orbitProfile?.display_name || normalizedEmail, email: orbitProfile?.email || normalizedEmail, avatarUrl: orbitProfile?.avatar_url || null });
    await groupsRepo.updateConversation(groupId, { participants, updated_at: new Date().toISOString() });

    try {
      await groupsRepo.insertGroupMember(groupId, profile.id, role);
    } catch (e: any) {
      toast.error(e.message?.includes("duplicate") ? "Already a member" : "Failed to add member"); return false;
    }

    haptic("success"); toast.success("Member added");
    await refreshMembers(groupId);
    return true;
  }, [refreshMembers]);

  const changeRole = useCallback(async (memberId: string, newRole: MemberRole) => {
    await groupsRepo.updateGroupMemberRole(memberId, newRole);
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: newRole } : m));
    haptic("light"); toast.success(`Role updated to ${ROLE_LABELS[newRole]}`);
  }, []);

  const removeMember = useCallback(async (groupId: string, memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    await groupsRepo.deleteGroupMember(memberId);

    if (member?.user_id) {
      const currentConv = await groupsRepo.fetchConversationParticipants(groupId);
      const parts = (Array.isArray(currentConv?.participants) ? currentConv.participants : []).filter((p: any) => p?.userId !== member.user_id && p?.user_id !== member.user_id);
      await groupsRepo.updateConversation(groupId, { participants: parts, updated_at: new Date().toISOString() });
    }

    haptic("light"); toast.success("Member removed");
    await refreshMembers(groupId);
  }, [members, refreshMembers]);

  const leaveGroup = useCallback(async (groupId: string) => {
    if (!userId) return;
    await groupsRepo.deleteGroupMemberByUser(groupId, userId);
    haptic("medium"); toast.success("Left group");
  }, [userId]);

  return { members, refreshMembers, addMember, changeRole, removeMember, leaveGroup };
}
