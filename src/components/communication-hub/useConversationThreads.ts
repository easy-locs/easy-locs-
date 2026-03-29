/**
 * useConversationThreads — THIN ORCHESTRATOR for the Communication Hub.
 * Delegates ALL logic to atomic units in src/lib/orbit/threads/*.
 * Responsibilities: orchestrate fetch → filter → map → enrich → sort → state.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { fetchThreadStats } from "@/repositories/communication.repository";
import { useAuth } from "@/contexts/AuthContext";
import type { ConversationThread } from "./types";
import { fetchOrgThreadSources, fetchV2Conversations, fetchDeals, fetchPreferences } from "@/lib/orbit/threads/thread-fetcher";
import { filterUserConversations } from "@/lib/orbit/threads/thread-filter";
import { mapOrgSourcesToThreads, mapV2ConversationsToThreads, mapDealsToThreads } from "@/lib/orbit/threads/thread-mapper";
import { enrichPeerProfiles, enrichUnreadCounts, enrichLastMessages, applyPreferences } from "@/lib/orbit/threads/thread-enricher";
import { normalizeAndSort } from "@/lib/orbit/threads/thread-sorter";
import { startFlow, addStep, completeStep, failStep, endFlow } from "@/lib/runtime/flow-tracer";
import { reportHealth } from "@/lib/runtime/health-aggregator";

export function useConversationThreads() {
  const { user, orgId } = useAuth();
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ unread: 0, pending_docs: 0, overdue: 0, maintenance: 0 });
  const loadingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadThreads = useCallback(async () => {
    if (!user?.id || loadingRef.current) {
      setThreads([]);
      setStats({ unread: 0, pending_docs: 0, overdue: 0, maintenance: 0 });
      setLoading(false);
      return;
    }
    loadingRef.current = true;
    setLoading(true);

    const flow = startFlow("orbit", "loadThreads");
    const threadMap = new Map<string, ConversationThread>();

    try {
      const hasOrg = !!orgId;

      // ── Step 1: Fetch org sources ──
      if (hasOrg) {
        const s1 = addStep(flow, "fetch_org_sources");
        const orgSources = await fetchOrgThreadSources(orgId!);
        mapOrgSourcesToThreads(orgSources, threadMap);
        completeStep(flow, s1, { threads: threadMap.size });
      }

      // ── Step 2: Fetch v2 conversations + deals + preferences in parallel ──
      const s2 = addStep(flow, "fetch_v2_deals_prefs");
      const [rawConvs, deals, prefs] = await Promise.all([
        fetchV2Conversations(user.id, hasOrg),
        hasOrg ? fetchDeals(orgId!) : Promise.resolve([]),
        fetchPreferences(user.id),
      ]);
      completeStep(flow, s2, { rawConvs: rawConvs.length, deals: deals.length, prefs: prefs.length });

      // ── Step 3: Filter + Map ──
      const s3 = addStep(flow, "filter_map");
      const allConvs = filterUserConversations(rawConvs, user.id);
      const allPeerIds = new Set<string>();
      mapV2ConversationsToThreads(allConvs, user.id, threadMap, allPeerIds);
      mapDealsToThreads(deals, threadMap);
      completeStep(flow, s3, { filtered: allConvs.length, peers: allPeerIds.size });

      // ── Step 4: Enrich in parallel ──
      const s4 = addStep(flow, "enrich");
      await Promise.all([
        enrichPeerProfiles(threadMap, allPeerIds),
        enrichUnreadCounts(threadMap, user.id),
        enrichLastMessages(threadMap, user.id),
      ]);
      completeStep(flow, s4);

      // ── Step 5: Apply preferences ──
      applyPreferences(threadMap, prefs);

      reportHealth("orbit", "ok", flow.steps.reduce((a, s) => a + (s.latencyMs ?? 0), 0));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failStep(flow, flow.steps[flow.steps.length - 1] || addStep(flow, "unknown"), msg);
      reportHealth("orbit", "degraded", undefined, msg);
    }

    // ── Step 6: Sort + finalize ──
    const sorted = normalizeAndSort(threadMap);
    endFlow(flow, "success");

    setThreads(sorted);
    setStats(s => ({ ...s, unread: sorted.filter(t => !t.archived).reduce((acc, t) => acc + t.unreadCount, 0) }));
    setLoading(false);
    loadingRef.current = false;
  }, [orgId, user]);

  const loadStats = useCallback(async () => {
    if (!orgId) return;
    try {
      const result = await fetchThreadStats(orgId);
      setStats(s => ({ ...s, ...result }));
    } catch (e) {
      console.warn("[comm-threads] loadStats error:", e);
    }
  }, [orgId]);

  // Initial load
  useEffect(() => { loadThreads(); loadStats(); }, [loadThreads, loadStats]);

  // Debounced reload for realtime events
  const debouncedReload = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void Promise.all([loadThreads(), loadStats()]);
    }, 800);
  }, [loadThreads, loadStats]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user?.id) return;
    const channel = createRealtimeChannel("hub-live");

    if (orgId) {
      channel
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "marketplace_bookings", filter: `org_id=eq.${orgId}` }, () => debouncedReload())
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "concierge_orders", filter: `org_id=eq.${orgId}` }, () => debouncedReload())
        .on("postgres_changes", { event: "*", schema: "public", table: "deal_rooms", filter: `org_id=eq.${orgId}` }, () => debouncedReload());
    }

    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "call_logs" }, () => debouncedReload())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations_v2" }, () => debouncedReload())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_preferences", filter: `user_id=eq.${user.id}` }, () => debouncedReload())
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      removeRealtimeChannel(channel);
    };
  }, [orgId, user?.id, debouncedReload]);

  const updateThreadLocally = useCallback((threadId: string, updates: Partial<ConversationThread>) => {
    setThreads(prev => {
      const next = prev
        .map(t => t.id === threadId ? { ...t, ...updates } : t)
        .sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
          const at = a.lastMessageTime || "";
          const bt = b.lastMessageTime || "";
          return bt.localeCompare(at);
        });
      setStats(s => ({ ...s, unread: next.filter(t => !t.archived).reduce((acc, t) => acc + t.unreadCount, 0) }));
      return next;
    });
  }, []);

  return {
    threads,
    setThreads,
    loading,
    stats,
    loadThreads,
    updateThreadLocally,
  };
}
