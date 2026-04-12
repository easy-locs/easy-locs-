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
import { platformBus } from "@/lib/shared/platform-bus";

export type RealtimeStatus = "connected" | "connecting" | "disconnected";

export function useConversationThreads(opts?: { enabled?: boolean }) {
  const { user, orgId } = useAuth();
  const enabled = opts?.enabled !== false;
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ unread: 0, pending_docs: 0, overdue: 0, maintenance: 0 });
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting");
  const loadingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userId = user?.id ?? null;

  const loadThreads = useCallback(async () => {
    if (!enabled) return;
    if (!userId) {
      setThreads([]);
      setStats({ unread: 0, pending_docs: 0, overdue: 0, maintenance: 0 });
      setLoading(false);
      setError(null);
      return;
    }
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    const flow = startFlow("orbit", "loadThreads");
    const threadMap = new Map<string, ConversationThread>();

    try {
      const hasOrg = !!orgId;

      // ── Step 1: Fetch org sources (isolated — failure does not block threads) ──
      if (hasOrg) {
        const s1 = addStep(flow, "fetch_org_sources");
        try {
          const orgSources = await fetchOrgThreadSources(orgId!);
          mapOrgSourcesToThreads(orgSources, threadMap);
          completeStep(flow, s1, { threads: threadMap.size });
        } catch (orgErr) {
          failStep(flow, s1, orgErr instanceof Error ? orgErr.message : String(orgErr));
          console.warn("[orbit-threads] fetchOrgThreadSources failed (isolated):", orgErr);
        }
      }

      // ── Step 2: Fetch v2 conversations + deals + preferences in parallel (each isolated) ──
      const s2 = addStep(flow, "fetch_v2_deals_prefs");
      const [rawConvsResult, dealsResult, prefsResult] = await Promise.allSettled([
        fetchV2Conversations(userId!, hasOrg),
        hasOrg ? fetchDeals(orgId!) : Promise.resolve([]),
        fetchPreferences(userId!),
      ]);
      const rawConvs = rawConvsResult.status === "fulfilled" ? rawConvsResult.value : [];
      const deals = dealsResult.status === "fulfilled" ? dealsResult.value : [];
      const prefs = prefsResult.status === "fulfilled" ? prefsResult.value : [];
      if (rawConvsResult.status === "rejected") console.warn("[orbit-threads] fetchV2Conversations failed (isolated):", rawConvsResult.reason);
      if (dealsResult.status === "rejected") console.warn("[orbit-threads] fetchDeals failed (isolated):", dealsResult.reason);
      if (prefsResult.status === "rejected") console.warn("[orbit-threads] fetchPreferences failed (isolated):", prefsResult.reason);
      completeStep(flow, s2, { rawConvs: rawConvs.length, deals: deals.length, prefs: prefs.length });

      // ── Step 3: Filter + Map ──
      const s3 = addStep(flow, "filter_map");
      const allConvs = filterUserConversations(rawConvs, userId!);
      const allPeerIds = new Set<string>();
      mapV2ConversationsToThreads(allConvs, userId!, threadMap, allPeerIds);
      mapDealsToThreads(deals, threadMap);
      completeStep(flow, s3, { filtered: allConvs.length, peers: allPeerIds.size });

      // ── Step 4: Enrich in parallel (each isolated) ──
      const s4 = addStep(flow, "enrich");
      const enrichResults = await Promise.allSettled([
        enrichPeerProfiles(threadMap, allPeerIds),
        enrichUnreadCounts(threadMap, userId!),
        enrichLastMessages(threadMap, userId!),
      ]);
      const enrichLabels = ["enrichPeerProfiles", "enrichUnreadCounts", "enrichLastMessages"];
      enrichResults.forEach((r, i) => {
        if (r.status === "rejected") console.warn(`[orbit-threads] ${enrichLabels[i]} failed (isolated):`, r.reason);
      });
      completeStep(flow, s4);

      // ── Step 5: Apply preferences ──
      applyPreferences(threadMap, prefs);

      reportHealth("orbit", "ok", flow.steps.reduce((a, s) => a + (s.latencyMs ?? 0), 0));

      const sorted = normalizeAndSort(threadMap);
      endFlow(flow, "success");

      setThreads(sorted);
      const newUnread = sorted.filter(t => !t.archived).reduce((acc, t) => acc + t.unreadCount, 0);
      setStats(s => s.unread === newUnread ? s : { ...s, unread: newUnread });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failStep(flow, flow.steps[flow.steps.length - 1] || addStep(flow, "unknown"), msg);
      reportHealth("orbit", "degraded", undefined, msg);
      endFlow(flow, "failed");
      setError(msg);
      console.error("[orbit-threads] loadThreads FAILED:", msg);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [orgId, userId, enabled]);

  const loadStats = useCallback(async () => {
    if (!orgId) return;
    try {
      const result = await fetchThreadStats(orgId);
      setStats(s => {
        const keys = Object.keys(result) as (keyof typeof result)[];
        const changed = keys.some(k => s[k] !== result[k]);
        return changed ? { ...s, ...result } : s;
      });
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

  useEffect(() => {
    if (!userId) return;

    const unsubMessage = platformBus.on("orbit:message_received", () => debouncedReload());
    const unsubMessageSent = platformBus.on("orbit:message_sent", () => debouncedReload());
    const unsubThread = platformBus.on("orbit:thread_created", () => debouncedReload());
    const unsubThreadUpdate = platformBus.on("orbit:thread_updated", () => debouncedReload());

    const channel = createRealtimeChannel("hub-live");

    if (orgId) {
      channel
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "marketplace_bookings", filter: `org_id=eq.${orgId}` }, () => debouncedReload())
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "concierge_orders", filter: `org_id=eq.${orgId}` }, () => debouncedReload())
        .on("postgres_changes", { event: "*", schema: "public", table: "deal_rooms", filter: `org_id=eq.${orgId}` }, () => debouncedReload());
    }

    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations_v2" }, () => debouncedReload())
      .on("postgres_changes", { event: "*", schema: "public", table: "call_logs" }, () => debouncedReload())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_preferences", filter: `user_id=eq.${userId}` }, () => debouncedReload())
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(`[orbit-threads] Realtime channel status: ${status}`);
          reportHealth("orbit", "degraded", undefined, `realtime_${status.toLowerCase()}`);
          setRealtimeStatus("disconnected");
        } else if (status === "CLOSED") {
          setRealtimeStatus("disconnected");
        }
      });

    return () => {
      unsubMessage();
      unsubMessageSent();
      unsubThread();
      unsubThreadUpdate();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      removeRealtimeChannel(channel);
    };
  }, [orgId, userId, debouncedReload]);

  const updateThreadLocally = useCallback((threadId: string, updates: Partial<ConversationThread>) => {
    let newUnread: number | null = null;
    setThreads(prev => {
      const idx = prev.findIndex(t => t.id === threadId);
      if (idx === -1) return prev;
      const existing = prev[idx];
      const keys = Object.keys(updates) as (keyof ConversationThread)[];
      const changed = keys.some(k => existing[k] !== updates[k]);
      if (!changed) return prev;
      const next = prev
        .map(t => t.id === threadId ? { ...t, ...updates } : t)
        .sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
          const at = a.lastMessageTime || "";
          const bt = b.lastMessageTime || "";
          return bt.localeCompare(at);
        });
      newUnread = next.filter(t => !t.archived).reduce((acc, t) => acc + t.unreadCount, 0);
      return next;
    });
    if (newUnread !== null) {
      setStats(s => (s.unread === newUnread ? s : { ...s, unread: newUnread! }));
    }
  }, []);

  return {
    threads,
    setThreads,
    loading,
    error,
    stats,
    realtimeStatus,
    loadThreads,
    updateThreadLocally,
  };
}
