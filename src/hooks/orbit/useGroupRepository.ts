/**
 * useGroupRepository — Atomic: CRUD for Orbit groups/channels/communities.
 */
import { useCallback } from "react";
import { fetchGroupMemberCount, fetchGroupLastMessage, fetchOrbitProfile, createConversation, insertGroupMember } from "@/repositories/communication.repository";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { trackOrbitEvent } from "@/lib/orbit/orbitTelemetry";

type GroupType = "group" | "channel" | "community";
type MemberRole = "admin" | "member" | "viewer";

export interface GroupRecord {
  id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  created_by: string;
  created_at: string;
  group_type: GroupType;
  posting_permission: "everyone" | "admins_only";
  member_count?: number;
  last_message?: string;
  last_message_at?: string;
}

export function useGroupRepository(userId: string | undefined) {
  const loadGroups = useCallback(async (): Promise<GroupRecord[]> => {
    if (!userId) return [];

    const { data: memberRows, error: memberErr } = await supabase
      .from("group_members").select("group_id").eq("user_id", userId);
    if (memberErr) throw new Error(memberErr.message);
    const memberGroupIds = (memberRows || []).map((r: any) => r.group_id).filter(Boolean);

    const { data, error } = await (supabase as any)
      .from("conversations_v2").select("*")
      .in("type", ["group", "channel", "community"])
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);

    const filtered = (data || []).filter((g: any) => {
      if (memberGroupIds.includes(g.id)) return true;
      const participants = Array.isArray(g.participants) ? g.participants : [];
      return participants.some((p: any) => (p?.userId || p?.user_id || p?.id) === userId);
    });

    return Promise.all(filtered.map(async (g: any) => {
      const { count } = await supabase.from("group_members").select("*", { count: "exact", head: true }).eq("group_id", g.id);
      const { data: lastMsg } = await (supabase as any).from("chat_messages_v2").select("body, created_at").eq("conversation_id", g.id).order("created_at", { ascending: false }).limit(1);
      return {
        id: g.id,
        name: g.title || "Untitled group",
        description: null,
        photo_url: null,
        created_by: g.created_by_orbit_id,
        created_at: g.created_at,
        group_type: (g.type || "group") as GroupType,
        posting_permission: g.type === "channel" ? "admins_only" : "everyone",
        member_count: count || 0,
        last_message: lastMsg?.[0]?.body || null,
        last_message_at: lastMsg?.[0]?.created_at || g.created_at,
      } as GroupRecord;
    }));
  }, [userId]);

  const createGroup = useCallback(async (name: string, groupType: GroupType): Promise<GroupRecord | null> => {
    if (!userId || !name.trim()) return null;

    const { data: myOrbit } = await (supabase as any)
      .from("orbit_profiles_v2").select("orbit_id, display_name, email, avatar_url").eq("id", userId).maybeSingle();

    const participants = [{ userId, orbitId: myOrbit?.orbit_id || null, displayName: myOrbit?.display_name || "You", email: myOrbit?.email || null, avatarUrl: myOrbit?.avatar_url || null }];

    const { data: created, error } = await (supabase as any).from("conversations_v2").insert({
      type: groupType, title: name.trim(), participants, created_by_orbit_id: myOrbit?.orbit_id || null, last_message_at: new Date().toISOString(),
    } as any).select("id, type, title, created_at, created_by_orbit_id").single();

    if (error || !created) { toast.error(error?.message || "Failed to create"); return null; }

    await supabase.from("group_members").insert({ group_id: created.id, user_id: userId, role: "admin" } as any);
    haptic("success");
    toast.success(groupType === "channel" ? "Channel created" : groupType === "community" ? "Community created" : "Group created");

    return {
      id: created.id, name: created.title || name.trim(), description: null, photo_url: null,
      created_by: created.created_by_orbit_id || userId, created_at: created.created_at,
      group_type: (created.type || groupType) as GroupType,
      posting_permission: created.type === "channel" ? "admins_only" : "everyone",
      member_count: 1, last_message: undefined, last_message_at: created.created_at,
    };
  }, [userId]);

  return { loadGroups, createGroup };
}
