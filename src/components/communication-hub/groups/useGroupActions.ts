/**
 * useGroupActions — Create, send, add/remove members, leave.
 * Pure action layer, no rendering.
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { trackOrbitEvent, guardDisplayName } from "@/lib/orbit/orbitTelemetry";
import type { Group, GroupType, GroupMember, GroupMessage, MemberRole } from "./types";
import { TYPE_LABELS, ROLE_LABELS } from "./group-helpers";

export function useGroupActions(
  loadGroups: () => Promise<void>,
  refreshMembers: (groupId: string) => Promise<void>,
) {
  const { user } = useAuth();
  const { t } = useI18n();

  const createGroup = useCallback(async (input: { name: string; description: string; group_type: GroupType }) => {
    if (!user?.id || !input.name.trim()) return null;

    const { data: myOrbit } = await (supabase as any)
      .from("orbit_profiles_v2")
      .select("orbit_id, display_name, email, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    const participants = [{
      userId: user.id,
      orbitId: myOrbit?.orbit_id || null,
      displayName: myOrbit?.display_name || "You",
      email: myOrbit?.email || null,
      avatarUrl: myOrbit?.avatar_url || null,
    }];

    const { data: created, error } = await (supabase as any).from("conversations_v2").insert({
      type: input.group_type,
      title: input.name.trim(),
      participants,
      created_by_orbit_id: myOrbit?.orbit_id || null,
      last_message_at: new Date().toISOString(),
    } as any).select("id, type, title, created_at, created_by_orbit_id").single();

    if (error || !created) { toast.error(error?.message || "Failed to create"); return null; }

    const { error: memberError } = await supabase.from("group_members").insert({
      group_id: created.id,
      user_id: user.id,
      role: "admin",
    } as any);

    if (memberError) { toast.error(memberError.message || "Failed to add creator"); return null; }

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

    const { data: myOrbit } = await (supabase as any)
      .from("orbit_profiles_v2")
      .select("orbit_id")
      .eq("id", user.id)
      .maybeSingle();

    const { data, error } = await (supabase as any).from("chat_messages_v2").insert({
      conversation_id: group.id,
      sender_user_id: user.id,
      sender_orbit_id: myOrbit?.orbit_id || null,
      type: "text",
      body: content,
    } as any).select().single();

    if (error) { toast.error(error.message || "Failed to send"); return null; }

    await (supabase as any).from("conversations_v2")
      .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", group.id);

    return data;
  }, [user?.id]);

  const addMember = useCallback(async (group: Group, email: string, role: MemberRole) => {
    const normalizedEmail = email.trim().toLowerCase();
    const { data: profile } = await supabase.from("profiles").select("id").eq("email", normalizedEmail).single();
    if (!profile) { toast.error(t("orbit.groups.user_not_found") || "User not found"); return false; }

    const { data: orbitProfile } = await (supabase as any)
      .from("orbit_profiles_v2")
      .select("orbit_id, display_name, email, avatar_url")
      .eq("id", profile.id)
      .maybeSingle();

    const { data: currentConv } = await (supabase as any)
      .from("conversations_v2")
      .select("participants")
      .eq("id", group.id)
      .single();

    if (!currentConv) { toast.error("Failed to resolve group"); return false; }

    const participants = Array.isArray(currentConv.participants) ? [...currentConv.participants] : [];
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

    await (supabase as any).from("conversations_v2")
      .update({ participants, updated_at: new Date().toISOString() })
      .eq("id", group.id);

    const { error } = await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: profile.id,
      role,
    } as any);

    if (error) {
      toast.error(error.message.includes("duplicate") ? "Already a member" : "Failed to add member");
      return false;
    }

    haptic("success");
    toast.success(t("orbit.groups.member_added") || "Member added");
    await refreshMembers(group.id);
    await loadGroups();
    return true;
  }, [t, loadGroups, refreshMembers]);

  const removeMember = useCallback(async (group: Group, memberId: string, memberUserId?: string) => {
    await supabase.from("group_members").delete().eq("id", memberId);

    if (memberUserId) {
      const { data: currentConv } = await (supabase as any)
        .from("conversations_v2")
        .select("participants")
        .eq("id", group.id)
        .single();
      const participants = (Array.isArray(currentConv?.participants) ? currentConv.participants : [])
        .filter((p: any) => p?.userId !== memberUserId && p?.user_id !== memberUserId);
      await (supabase as any).from("conversations_v2")
        .update({ participants, updated_at: new Date().toISOString() })
        .eq("id", group.id);
    }

    haptic("light");
    toast.success(t("orbit.groups.member_removed") || "Member removed");
    await refreshMembers(group.id);
    await loadGroups();
  }, [t, loadGroups, refreshMembers]);

  const changeMemberRole = useCallback(async (memberId: string, newRole: MemberRole) => {
    const { error } = await supabase.from("group_members").update({ role: newRole } as any).eq("id", memberId);
    if (!error) {
      haptic("light");
      toast.success(`Role updated to ${ROLE_LABELS[newRole]}`);
    }
    return !error;
  }, []);

  const leaveGroup = useCallback(async (group: Group) => {
    if (!user?.id) return;
    await supabase.from("group_members").delete().eq("group_id", group.id).eq("user_id", user.id);
    haptic("medium");
    toast.success(t("orbit.groups.left") || "Left group");
    loadGroups();
  }, [user?.id, t, loadGroups]);

  return { createGroup, sendMessage, addMember, removeMember, changeMemberRole, leaveGroup };
}
