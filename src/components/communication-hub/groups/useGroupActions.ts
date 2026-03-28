/**
 * useGroupActions — Create, send, add/remove members, leave.
 * Pure action layer, no rendering. Delegates all DB to communication.repository.
 */
import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { trackOrbitEvent, guardDisplayName } from "@/lib/orbit/orbitTelemetry";
import type { Group, GroupType, GroupMember, GroupMessage, MemberRole } from "./types";
import { TYPE_LABELS, ROLE_LABELS } from "./group-helpers";
import {
  resolveOrbitProfile, resolveProfileByEmail, createConversation,
  insertGroupMember, insertMessage, updateConversationTimestamp,
  getConversationParticipants, updateConversationParticipants,
  deleteGroupMember, deleteGroupMemberByUser, updateGroupMemberRole,
} from "@/repositories/communication.repository";

export function useGroupActions(
  loadGroups: () => Promise<void>,
  refreshMembers: (groupId: string) => Promise<void>,
) {
  const { user } = useAuth();
  const { t } = useI18n();

  const createGroup = useCallback(async (input: { name: string; description: string; group_type: GroupType }) => {
    if (!user?.id || !input.name.trim()) return null;

    const myOrbit = await resolveOrbitProfile(user.id);

    const participants = [{
      userId: user.id,
      orbitId: myOrbit?.orbit_id || null,
      displayName: myOrbit?.display_name || "You",
      email: myOrbit?.email || null,
      avatarUrl: myOrbit?.avatar_url || null,
    }];

    const created = await createConversation({
      type: input.group_type,
      title: input.name.trim(),
      participants,
      createdByOrbitId: myOrbit?.orbit_id || null,
    });

    if (!created) { toast.error("Failed to create"); return null; }

    try {
      await insertGroupMember(created.id, user.id, "admin");
    } catch (e: any) {
      toast.error(e?.message || "Failed to add creator");
      return null;
    }

    haptic("success");
    toast.success(
      input.group_type === "channel" ? "Channel created" :
        input.group_type === "community" ? "Community created" :
          (t("orbit.groups.created") || "Group created")
    );

    const createdGroup: Group = {
      id: created.id,
      name: created.title || input.name.trim(),
      description: null,
      photo_url: null,
      created_by: created.created_by_orbit_id || user.id,
      created_at: created.created_at,
      group_type: (created.type || input.group_type) as GroupType,
      posting_permission: created.type === "channel" ? "admins_only" : "everyone",
      member_count: 1,
      last_message: null,
      last_message_at: created.created_at,
    };

    await loadGroups();
    return createdGroup;
  }, [user?.id, loadGroups, t]);

  const sendMessage = useCallback(async (group: Group, content: string) => {
    if (!content.trim() || !user?.id) return null;

    const myOrbit = await resolveOrbitProfile(user.id);

    const data = await insertMessage({
      conversationId: group.id,
      senderUserId: user.id,
      senderOrbitId: myOrbit?.orbit_id || null,
      type: "text",
      body: content,
    });

    await updateConversationTimestamp(group.id);
    return data;
  }, [user?.id]);

  const addMember = useCallback(async (group: Group, email: string, role: MemberRole) => {
    const normalizedEmail = email.trim().toLowerCase();
    const profile = await resolveProfileByEmail(normalizedEmail);
    if (!profile) { toast.error(t("orbit.groups.user_not_found") || "User not found"); return false; }

    const orbitProfile = await resolveOrbitProfile(profile.id);
    const currentParticipants = await getConversationParticipants(group.id);

    const participants = Array.isArray(currentParticipants) ? [...currentParticipants] : [];
    if (participants.some((p: any) => p?.userId === profile.id || p?.user_id === profile.id)) {
      toast.info("Already a member");
      return false;
    }

    participants.push({
      userId: profile.id,
      orbitId: orbitProfile?.orbit_id || null,
      displayName: orbitProfile?.display_name || normalizedEmail,
      email: orbitProfile?.email || normalizedEmail,
      avatarUrl: orbitProfile?.avatar_url || null,
    });

    await updateConversationParticipants(group.id, participants);

    try {
      await insertGroupMember(group.id, profile.id, role);
    } catch (e: any) {
      toast.error(e?.message?.includes("duplicate") ? "Already a member" : "Failed to add member");
      return false;
    }

    haptic("success");
    toast.success(t("orbit.groups.member_added") || "Member added");
    await refreshMembers(group.id);
    await loadGroups();
    return true;
  }, [t, loadGroups, refreshMembers]);

  const removeMember = useCallback(async (group: Group, memberId: string, memberUserId?: string) => {
    await deleteGroupMember(memberId);

    if (memberUserId) {
      const currentParticipants = await getConversationParticipants(group.id);
      const participants = (Array.isArray(currentParticipants) ? currentParticipants : [])
        .filter((p: any) => p?.userId !== memberUserId && p?.user_id !== memberUserId);
      await updateConversationParticipants(group.id, participants);
    }

    haptic("light");
    toast.success(t("orbit.groups.member_removed") || "Member removed");
    await refreshMembers(group.id);
    await loadGroups();
  }, [t, loadGroups, refreshMembers]);

  const changeMemberRole = useCallback(async (memberId: string, newRole: MemberRole) => {
    try {
      await updateGroupMemberRole(memberId, newRole);
      haptic("light");
      toast.success(`Role updated to ${ROLE_LABELS[newRole]}`);
      return true;
    } catch {
      return false;
    }
  }, []);

  const leaveGroup = useCallback(async (group: Group) => {
    if (!user?.id) return;
    await deleteGroupMemberByUser(group.id, user.id);
    haptic("medium");
    toast.success(t("orbit.groups.left") || "Left group");
    loadGroups();
  }, [user?.id, t, loadGroups]);

  return { createGroup, sendMessage, addMember, removeMember, changeMemberRole, leaveGroup };
}
