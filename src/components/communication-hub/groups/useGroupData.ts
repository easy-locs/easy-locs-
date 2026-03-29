/**
 * useGroupData — Data loading for groups/channels/communities.
 * Single responsibility: fetch, enrich, and return group list.
 * PHASE 2: No direct Supabase — uses repository.
 */
import { useState, useCallback, useEffect } from "react";
import {
  fetchGroupMemberIds,
  fetchGroupConversations,
  fetchGroupMemberCount,
  fetchLastGroupMessage,
} from "@/repositories/communication.repository";
import { useAuth } from "@/contexts/AuthContext";
import type { Group, GroupType } from "./types";

export function useGroupData() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    if (!user?.id) {
      setGroups([]);
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);

    try {
      const memberGroupIds = await fetchGroupMemberIds(user.id);
      const data = await fetchGroupConversations();

      const filtered = data.filter((g: any) => {
        if (memberGroupIds.includes(g.id)) return true;
        const participants = Array.isArray(g.participants) ? g.participants : [];
        return participants.some((p: any) => (p?.userId || p?.user_id || p?.id) === user.id);
      });

      const enriched = await Promise.all(filtered.map(async (g: any) => {
        const [memberCount, lastMsg] = await Promise.all([
          fetchGroupMemberCount(g.id),
          fetchLastGroupMessage(g.id),
        ]);
        return {
          id: g.id,
          name: g.title || "Untitled group",
          description: null,
          photo_url: null,
          created_by: g.created_by_orbit_id,
          created_at: g.created_at,
          group_type: (g.type || "group") as GroupType,
          posting_permission: g.type === "channel" ? "admins_only" : "everyone",
          member_count: memberCount,
          last_message: lastMsg?.body || null,
          last_message_at: lastMsg?.created_at || g.created_at,
        } as Group;
      }));

      setGroups(enriched);
    } catch (err: any) {
      setLoadError(err?.message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  return { groups, loading, loadError, loadGroups };
}
