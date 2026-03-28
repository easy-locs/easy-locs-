/**
 * useGroupData — Data loading for groups/channels/communities.
 * Single responsibility: fetch, enrich, and return group list.
 */
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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

    const { data: memberRows, error: memberErr } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id);

    if (memberErr) { setLoadError(memberErr.message); setLoading(false); return; }
    const memberGroupIds = (memberRows || []).map((r: any) => r.group_id).filter(Boolean);

    const { data, error } = await (supabase as any)
      .from("conversations_v2")
      .select("*")
      .in("type", ["group", "channel", "community"])
      .order("updated_at", { ascending: false });

    if (error) { setLoadError(error.message); setLoading(false); return; }

    const filtered = (data || []).filter((g: any) => {
      if (memberGroupIds.includes(g.id)) return true;
      const participants = Array.isArray(g.participants) ? g.participants : [];
      return participants.some((p: any) => (p?.userId || p?.user_id || p?.id) === user.id);
    });

    const enriched = await Promise.all(filtered.map(async (g: any) => {
      const { count } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", g.id);
      const { data: lastMsg } = await (supabase as any)
        .from("chat_messages_v2")
        .select("body, created_at")
        .eq("conversation_id", g.id)
        .order("created_at", { ascending: false })
        .limit(1);
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
      } as Group;
    }));

    setGroups(enriched);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  return { groups, loading, loadError, loadGroups };
}
