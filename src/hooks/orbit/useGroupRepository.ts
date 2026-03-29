/**
 * useGroupRepository — Atomic: CRUD for Orbit groups/channels/communities.
 * MIGRATED: All DB ops via rental.repository.
 */
import { useCallback } from "react";
import {
  fetchGroupMemberIds, fetchGroupConversations, fetchGroupMemberCount,
  fetchGroupLastMessage, createGroupConversation, insertGroupMember,
} from "@/repositories/rental.repository";
import { fetchOrbitProfile } from "@/repositories/communication.repository";
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

    const memberGroupIds = await fetchGroupMemberIds(userId);
    const data = await fetchGroupConversations();

    const filtered = (data || []).filter((g: any) => {
      if (memberGroupIds.includes(g.id)) return true;
      const participants = Array.isArray(g.participants) ? g.participants : [];
      return participants.some((p: any) => (p?.userId || p?.user_id || p?.id) === userId);
    });

    return Promise.all(filtered.map(async (g: any) => {
      const count = await fetchGroupMemberCount(g.id);
      const lastMsg = await fetchGroupLastMessage(g.id);
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
        last_message: lastMsg?.body || null,
        last_message_at: lastMsg?.created_at || g.created_at,
      } as GroupRecord;
    }));
  }, [userId]);

  const createGroup = useCallback(async (name: string, groupType: GroupType): Promise<GroupRecord | null> => {
    if (!userId || !name.trim()) return null;

    const myOrbit = await fetchOrbitProfile(userId);
    const participants = [{ userId, orbitId: myOrbit?.orbit_id || null, displayName: myOrbit?.display_name || "You", email: myOrbit?.email || null, avatarUrl: myOrbit?.avatar_url || null }];

    const created = await createGroupConversation({
      type: groupType, title: name.trim(), participants, created_by_orbit_id: myOrbit?.orbit_id || null, last_message_at: new Date().toISOString(),
    });

    if (!created) { toast.error("Failed to create"); return null; }

    await insertGroupMember(created.id, userId, "admin");
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
