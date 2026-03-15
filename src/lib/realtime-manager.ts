/**
 * RealtimeManager — Centralized realtime channel management.
 * 
 * Architecture:
 * 1. ONE user-scoped channel (`rt:user:{userId}`) — listens to all user-relevant
 *    postgres_changes (call_logs, messages, notifications, booking_requests,
 *    concierge_orders, deal_rooms, conversation_threads).
 * 2. ONE presence channel (`rt:presence:{userId}`) — heartbeat + online/offline.
 * 3. ON-DEMAND thread channels (`rt:thread:{threadId}`) — only while chat is open.
 * 4. ON-DEMAND call channels (`call:{callId}`) — managed by call-manager.ts directly.
 *
 * Benefits:
 * - Reduces channel count from ~10+ to 2 persistent + N ephemeral.
 * - Single point of subscribe/unsubscribe lifecycle management.
 * - Centralized query invalidation via callback registry.
 * - Compact signal pattern: listeners receive lightweight payloads, fetch fresh data on demand.
 */

import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ─── Types ───────────────────────────────────────────────────────────────────

type TableName =
  | "call_logs"
  | "messages"
  | "notifications"
  | "booking_requests"
  | "concierge_orders"
  | "deal_rooms"
  | "conversation_threads";

type EventType = "INSERT" | "UPDATE" | "DELETE" | "*";

export interface RealtimeSignal {
  table: TableName;
  eventType: EventType;
  /** Minimal payload — only IDs + changed fields, not full row */
  new: Record<string, any> | null;
  old: Record<string, any> | null;
}

type SignalHandler = (signal: RealtimeSignal) => void;

interface ThreadSubscription {
  channel: RealtimeChannel;
  typingChannel: RealtimeChannel;
  refCount: number;
}

// ─── Manager ─────────────────────────────────────────────────────────────────

class RealtimeManager {
  private userId: string | null = null;
  private orgId: string | null = null;
  private userChannel: RealtimeChannel | null = null;
  private presenceChannel: RealtimeChannel | null = null;
  private threadSubs = new Map<string, ThreadSubscription>();
  private handlers = new Set<SignalHandler>();
  private presenceInterval: ReturnType<typeof setInterval> | null = null;
  private visibilityHandler: (() => void) | null = null;
  private started = false;

  // ── Lifecycle ──

  /**
   * Start the manager for an authenticated user.
   * Idempotent — calling again with same userId is a no-op.
   */
  start(userId: string, orgId?: string | null) {
    if (this.started && this.userId === userId && this.orgId === (orgId ?? null)) return;
    this.stop(); // clean previous session

    this.userId = userId;
    this.orgId = orgId ?? null;
    this.started = true;

    this.initUserChannel();
    this.initPresenceChannel();
  }

  /** Tear down all channels and clear state. */
  stop() {
    // Set offline before tearing down channels
    if (this.userId) {
      supabase.from("user_presence").upsert({
        user_id: this.userId,
        status: "offline",
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "user_id" }).then(() => {}, () => {});
    }

    // Remove visibility listener
    if (this.visibilityHandler) {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
      this.visibilityHandler = null;
    }

    if (this.userChannel) {
      supabase.removeChannel(this.userChannel);
      this.userChannel = null;
    }
    if (this.presenceChannel) {
      supabase.removeChannel(this.presenceChannel);
      this.presenceChannel = null;
    }
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
    }
    // Close all thread channels
    for (const [, sub] of this.threadSubs) {
      supabase.removeChannel(sub.channel);
      supabase.removeChannel(sub.typingChannel);
    }
    this.threadSubs.clear();
    this.started = false;
    this.userId = null;
    this.orgId = null;
  }

  /** Update orgId without full restart (e.g. on org switch). */
  setOrgId(orgId: string | null) {
    if (this.orgId === orgId) return;
    this.orgId = orgId;
    // Restart user channel with new org filter
    if (this.started && this.userId) {
      if (this.userChannel) {
        supabase.removeChannel(this.userChannel);
        this.userChannel = null;
      }
      this.initUserChannel();
    }
  }

  // ── Signal handlers (pub/sub for UI refresh) ──

  onSignal(handler: SignalHandler): () => void {
    this.handlers.add(handler);
    return () => { this.handlers.delete(handler); };
  }

  private emit(signal: RealtimeSignal) {
    this.handlers.forEach((h) => {
      try { h(signal); } catch (e) { console.debug("[RT] handler error:", e); }
    });
  }

  // ── Thread channels (on-demand) ──

  /**
   * Subscribe to a specific thread's messages + typing.
   * Returns { unsubscribe } — call when the chat panel unmounts.
   */
  openThread(
    threadId: string,
    orgId: string,
    opts: {
      onMessage?: (payload: any) => void;
      onUpdate?: (payload: any) => void;
      onDelete?: (payload: any) => void;
      onTypingSync?: (others: any[]) => void;
      currentUserId?: string;
    }
  ) {
    const existing = this.threadSubs.get(threadId);
    if (existing) {
      existing.refCount++;
      return {
        typingChannel: existing.typingChannel,
        unsubscribe: () => this.closeThread(threadId),
      };
    }

    const msgChannel = supabase
      .channel(`rt:thread:${threadId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `org_id=eq.${orgId}`,
      }, (p) => opts.onMessage?.(p))
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "messages",
        filter: `org_id=eq.${orgId}`,
      }, (p) => opts.onUpdate?.(p))
      .on("postgres_changes", {
        event: "DELETE", schema: "public", table: "messages",
        filter: `org_id=eq.${orgId}`,
      }, (p) => opts.onDelete?.(p))
      .subscribe();

    const typChannel = supabase.channel(`rt:typing:${threadId}`);
    typChannel
      .on("presence", { event: "sync" }, () => {
        const state = typChannel.presenceState();
        const others = Object.values(state)
          .flat()
          .filter((p: any) => p.user_id !== opts.currentUserId);
        opts.onTypingSync?.(others);
      })
      .subscribe();

    this.threadSubs.set(threadId, {
      channel: msgChannel,
      typingChannel: typChannel,
      refCount: 1,
    });

    return {
      typingChannel: typChannel,
      unsubscribe: () => this.closeThread(threadId),
    };
  }

  private closeThread(threadId: string) {
    const sub = this.threadSubs.get(threadId);
    if (!sub) return;
    sub.refCount--;
    if (sub.refCount <= 0) {
      supabase.removeChannel(sub.channel);
      supabase.removeChannel(sub.typingChannel);
      this.threadSubs.delete(threadId);
    }
  }

  // ── Internal: user-scoped channel ──

  private initUserChannel() {
    if (!this.userId) return;

    const tables: { table: TableName; filter?: string }[] = [
      { table: "call_logs" },
      { table: "messages" },
      { table: "notifications", filter: `user_id=eq.${this.userId}` },
      { table: "booking_requests", filter: this.orgId ? `org_id=eq.${this.orgId}` : undefined },
      { table: "concierge_orders", filter: this.orgId ? `org_id=eq.${this.orgId}` : undefined },
      { table: "deal_rooms", filter: this.orgId ? `org_id=eq.${this.orgId}` : undefined },
      { table: "conversation_threads", filter: this.orgId ? `org_id=eq.${this.orgId}` : undefined },
    ];

    let ch = supabase.channel(`rt:user:${this.userId}`);

    for (const { table, filter } of tables) {
      const config: any = { event: "*", schema: "public", table };
      if (filter) config.filter = filter;
      ch = ch.on("postgres_changes", config, (payload) => {
        this.emit({
          table: table as TableName,
          eventType: payload.eventType as EventType,
          new: (payload as any).new ?? null,
          old: (payload as any).old ?? null,
        });
      });
    }

    this.userChannel = ch.subscribe();
  }

  // ── Internal: presence channel ──

  private initPresenceChannel() {
    if (!this.userId) return;

    this.presenceChannel = supabase
      .channel(`rt:presence:${this.userId}`)
      .subscribe();

    // Heartbeat presence via DB upsert (30s)
    const heartbeat = async () => {
      if (!this.userId) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        await supabase.from("user_presence").upsert({
          user_id: this.userId,
          status: document.hidden ? "away" : "online",
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          device_type: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "web",
        } as any, { onConflict: "user_id" });
      } catch { /* non-critical */ }
    };

    heartbeat();
    this.presenceInterval = setInterval(heartbeat, 30_000);

    // Visibility change — stored as a class reference for deterministic cleanup
    this.visibilityHandler = () => {
      if (!this.userId) return;
      supabase.from("user_presence").upsert({
        user_id: this.userId,
        status: document.hidden ? "away" : "online",
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        device_type: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "web",
      } as any, { onConflict: "user_id" }).then(() => {}, () => {});
    };
    document.addEventListener("visibilitychange", this.visibilityHandler);
  }

  // ── Accessors ──

  get isStarted() { return this.started; }
  get currentUserId() { return this.userId; }
  get channelCount() { return (this.userChannel ? 1 : 0) + (this.presenceChannel ? 1 : 0) + this.threadSubs.size * 2; }
}

/** Singleton instance */
export const realtimeManager = new RealtimeManager();
