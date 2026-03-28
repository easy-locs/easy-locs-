/**
 * useGroupMembers — Atomic: member CRUD for Orbit groups.
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

type MemberRole = "admin" | "member" | "viewer";

export interface GroupMember {
  id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  profile_name?: string;
}

const ROLE_LABELS: Record<MemberRole, string> = { admin: "Admin", member: "Member", viewer: "Viewer" };

export function useGroupMembers(userId: string | undefined) {
  const [members, setMembers] = useState<GroupMember[]>([]);

  const refreshMembers = useCallback(async (groupId: string) => {
    const { data } = await supabase.from("group_members").select("*").eq("group_id", groupId);
    setMembers((data as GroupMember[]) || []);
  }, []);

  const addMember = useCallback(async (groupId: string, email: string, role: MemberRole) => {
    const normalizedEmail = email.trim().toLowerCase();
    const { data: profile } = await supabase.from("profiles").select("id").eq("email", normalizedEmail).single();
    if (!profile) { toast.error("User not found"); return false; }

    const { data: orbitProfile } = await (supabase as any).from("orbit_profiles_v2").select("orbit_id, display_name, email, avatar_url").eq("id", profile.id).maybeSingle();

    // Update participants in conversations_v2
    const { data: currentConv, error: convErr } = await (supabase as any).from("conversations_v2").select("participants").eq("id", groupId).single();
    if (convErr) { toast.error(convErr.message); return false; }

    const participants = Array.isArray(currentConv?.participants) ? [...currentConv.participants] : [];
    if (participants.some((p: any) => p?.userId === profile.id || p?.user_id === profile.id)) { toast.info("Already a member"); return false; }

    participants.push({ userId: profile.id, orbitId: orbitProfile?.orbit_id || null, displayName: orbitProfile?.display_name || normalizedEmail, email: orbitProfile?.email || normalizedEmail, avatarUrl: orbitProfile?.avatar_url || null });
    await (supabase as any).from("conversations_v2").update({ participants, updated_at: new Date().toISOString() }).eq("id", groupId);

    const { error } = await supabase.from("group_members").insert({ group_id: groupId, user_id: profile.id, role } as any);
    if (error) { toast.error(error.message.includes("duplicate") ? "Already a member" : "Failed to add member"); return false; }

    haptic("success");
    toast.success("Member added");
    await refreshMembers(groupId);
    return true;
  }, [refreshMembers]);

  const changeRole = useCallback(async (memberId: string, newRole: MemberRole) => {
    const { error } = await supabase.from("group_members").update({ role: newRole } as any).eq("id", memberId);
    if (!error) {
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: newRole } : m));
      haptic("light");
      toast.success(`Role updated to ${ROLE_LABELS[newRole]}`);
    }
  }, []);

  const removeMember = useCallback(async (groupId: string, memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    await supabase.from("group_members").delete().eq("id", memberId);

    if (member?.user_id) {
      const { data: currentConv } = await (supabase as any).from("conversations_v2").select("participants").eq("id", groupId).single();
      const parts = (Array.isArray(currentConv?.participants) ? currentConv.participants : []).filter((p: any) => p?.userId !== member.user_id && p?.user_id !== member.user_id);
      await (supabase as any).from("conversations_v2").update({ participants: parts, updated_at: new Date().toISOString() }).eq("id", groupId);
    }

    haptic("light");
    toast.success("Member removed");
    await refreshMembers(groupId);
  }, [members, refreshMembers]);

  const leaveGroup = useCallback(async (groupId: string) => {
    if (!userId) return;
    await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
    haptic("medium");
    toast.success("Left group");
  }, [userId]);

  return { members, refreshMembers, addMember, changeRole, removeMember, leaveGroup };
}
