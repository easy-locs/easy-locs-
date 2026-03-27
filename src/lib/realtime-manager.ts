/**
 * RealtimeManager — Centralized realtime channel management (v2 — optimized).
 * 
 * Architecture:
 * 1. ONE user-scoped channel — filtered postgres_changes per table.
 * 2. ONE presence channel — heartbeat with skip-if-unchanged optimization.
 * 3. ON-DEMAND thread channels — ref-counted, only while chat is open.
 * 4. Multi-tab coordination via BroadcastChannel to prevent duplicate work.
 * 5. Health monitoring for debugging channel leaks.
 */

import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ─── Types ───────────────────────────────────────────────────────────────────

type TableName =
  | "call_logs"
  | "chat_messages_v2"
  | "app_notifications"
  | "booking_requests"
  | "concierge_orders"
  | "deal_rooms"
  | "conversations_v2";

type EventType = "INSERT" | "UPDATE" | "DELETE" | "*";

export interface RealtimeSignal {
  table: TableName;
  eventType: EventType;
  /** Compact payload — IDs only for signal-based refresh */
  new: Record<string, any> | null;
  old: Record<string, any> | null;
}

type SignalHandler = (signal: RealtimeSignal) => void;

interface ThreadSubscription {
  channel: RealtimeChannel;
  typingChannel: RealtimeChannel;
  refCount: number;
}

export interface RealtimeHealth {
  started: boolean;
  userId: string | null;
  orgId: string | null;
  channelCount: number;
  threadCount: number;
  threadIds: string[];
  handlerCount: number;
  presenceStatus: string;
  lastHeartbeat: number | null;
  tabRole: "leader" | "follower";
  duplicateSignalsBlocked: number;
}

// ─── Multi-tab coordination ──────────────────────────────────────────────────

const TAB_CHANNEL_NAME = "orbit-rt-coord";
const TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface TabMessage {
  type: "signal" | "leader-ping" | "leader-claim";
  tabId: string;
  payload?: any;
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

  // Presence optimization
  private lastPresenceStatus: string = "";
  private lastHeartbeatAt: number = 0;

  // Multi-tab coordination
  private tabChannel: BroadcastChannel | null = null;
  private isLeaderTab = true;
  private duplicateSignalsBlocked = 0;

  // Signal deduplication
  private recentSignals = new Map<string, number>();
  private signalCleanupInterval: ReturnType<typeof setInterval> | null = null;

  // ── Lifecycle ──

  start(userId: string, orgId?: string | null) {
    if (this.started && this.userId === userId && this.orgId === (orgId ?? null)) return;
    this.stop();

    this.userId = userId;
    this.orgId = orgId ?? null;
    this.started = true;

    this.initTabCoordination();
    this.initUserChannel();
    this.initPresenceChannel();
    this.initSignalDedup();
  }

  stop() {
    // Set offline before teardown (only leader tab writes) — validate session first
    if (this.userId && this.isLeaderTab) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.access_token) return;
        supabase.from("user_presence").upsert({
          user_id: this.userId,
          status: "offline",
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any, { onConflict: "user_id" }).then(() => {}, () => {});
      }).catch(() => {});
    }

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
    if (this.signalCleanupInterval) {
      clearInterval(this.signalCleanupInterval);
      this.signalCleanupInterval = null;
    }
    if (this.tabChannel) {
      this.tabChannel.close();
      this.tabChannel = null;
    }

    for (const [, sub] of this.threadSubs) {
      supabase.removeChannel(sub.channel);
      supabase.removeChannel(sub.typingChannel);
    }
    this.threadSubs.clear();
    this.recentSignals.clear();
    this.started = false;
    this.userId = null;
    this.orgId = null;
    this.lastPresenceStatus = "";
  }

  setOrgId(orgId: string | null) {
    if (this.orgId === orgId) return;
    this.orgId = orgId;
    if (this.started && this.userId) {
      if (this.userChannel) {
        supabase.removeChannel(this.userChannel);
        this.userChannel = null;
      }
      this.initUserChannel();
    }
  }

  // ── Signal handlers ──

  onSignal(handler: SignalHandler): () => void {
    this.handlers.add(handler);
    return () => { this.handlers.delete(handler); };
  }

  private emit(signal: RealtimeSignal) {
    // Deduplication: skip if we emitted the same signal within 100ms
    const key = `${signal.table}:${signal.eventType}:${(signal.new as any)?.id || (signal.old as any)?.id || ""}`;
    const now = Date.now();
    const last = this.recentSignals.get(key);
    if (last && now - last < 100) {
      this.duplicateSignalsBlocked++;
      return;
    }
    this.recentSignals.set(key, now);

    this.handlers.forEach((h) => {
      try { h(signal); } catch (e) { console.debug("[RT] handler error:", e); }
    });

    // Broadcast to other tabs (lightweight signal only)
    this.broadcastToTabs(signal);
  }

  // ── Thread channels (on-demand) ──

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
        event: "INSERT", schema: "public", table: "chat_messages_v2",
        filter: `conversation_id=eq.${threadId}`,
      }, (p) => opts.onMessage?.(p))
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "chat_messages_v2",
        filter: `conversation_id=eq.${threadId}`,
      }, (p) => opts.onUpdate?.(p))
      .on("postgres_changes", {
        event: "DELETE", schema: "public", table: "chat_messages_v2",
        filter: `conversation_id=eq.${threadId}`,
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
      // call_logs: no org filter needed — user sees calls they participate in
      { table: "call_logs" },
      // chat_messages_v2: V2 canonical messages
      { table: "chat_messages_v2" },
      // app_notifications: always filter by user
      { table: "app_notifications", filter: `user_id=eq.${this.userId}` },
      // org-scoped tables: filter when org available
      { table: "booking_requests", filter: this.orgId ? `org_id=eq.${this.orgId}` : undefined },
      { table: "concierge_orders", filter: this.orgId ? `org_id=eq.${this.orgId}` : undefined },
      { table: "deal_rooms", filter: this.orgId ? `org_id=eq.${this.orgId}` : undefined },
      // conversations_v2: V2 canonical conversations
      { table: "conversations_v2" },
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

  // ── Internal: presence channel (optimized) ──

  private initPresenceChannel() {
    if (!this.userId) return;

    this.presenceChannel = supabase
      .channel(`rt:presence:${this.userId}`)
      .subscribe();

    const deviceType = /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "web";

    // Optimized heartbeat: skip write if status unchanged
    const heartbeat = async () => {
      if (!this.userId || !this.isLeaderTab) return;
      const currentStatus = document.hidden ? "away" : "online";

      // Skip if status unchanged and last heartbeat was < 25s ago
      if (currentStatus === this.lastPresenceStatus && Date.now() - this.lastHeartbeatAt < 25_000) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        await supabase.from("user_presence").upsert({
          user_id: this.userId,
          status: currentStatus,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          device_type: deviceType,
        } as any, { onConflict: "user_id" });
        this.lastPresenceStatus = currentStatus;
        this.lastHeartbeatAt = Date.now();
      } catch { /* non-critical */ }
    };

    heartbeat();
    this.presenceInterval = setInterval(heartbeat, 30_000);

    // Visibility change — debounced to avoid rapid toggle noise
    let visDebounce: ReturnType<typeof setTimeout> | null = null;
    this.visibilityHandler = () => {
      if (visDebounce) clearTimeout(visDebounce);
      visDebounce = setTimeout(async () => {
        if (!this.userId || !this.isLeaderTab) return;
        const status = document.hidden ? "away" : "online";
        if (status === this.lastPresenceStatus) return;
        // Validate session before writing to prevent RLS 401
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        supabase.from("user_presence").upsert({
          user_id: this.userId,
          status,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          device_type: deviceType,
        } as any, { onConflict: "user_id" }).then(() => {
          this.lastPresenceStatus = status;
          this.lastHeartbeatAt = Date.now();
        }, () => {});
      }, 500); // 500ms debounce prevents rapid toggle
    };
    document.addEventListener("visibilitychange", this.visibilityHandler);
  }

  // ── Multi-tab coordination ──

  private initTabCoordination() {
    try {
      this.tabChannel = new BroadcastChannel(TAB_CHANNEL_NAME);
      this.isLeaderTab = true; // assume leader, yield if another tab claims

      this.tabChannel.onmessage = (event: MessageEvent<TabMessage>) => {
        const msg = event.data;
        if (msg.tabId === TAB_ID) return; // ignore own messages

        if (msg.type === "leader-claim") {
          // Another tab claimed leadership — yield
          this.isLeaderTab = false;
        }
      };

      // Claim leadership
      this.tabChannel.postMessage({ type: "leader-claim", tabId: TAB_ID } as TabMessage);
    } catch {
      // BroadcastChannel not supported — run as standalone
      this.isLeaderTab = true;
    }
  }

  private broadcastToTabs(signal: RealtimeSignal) {
    try {
      this.tabChannel?.postMessage({
        type: "signal",
        tabId: TAB_ID,
        payload: { table: signal.table, eventType: signal.eventType },
      } as TabMessage);
    } catch { /* ignore */ }
  }

  // ── Signal deduplication cleanup ──

  private initSignalDedup() {
    // Clean old entries every 10s to prevent memory growth
    this.signalCleanupInterval = setInterval(() => {
      const cutoff = Date.now() - 5000;
      for (const [key, ts] of this.recentSignals) {
        if (ts < cutoff) this.recentSignals.delete(key);
      }
    }, 10_000);
  }

  // ── Health monitoring ──

  getHealth(): RealtimeHealth {
    return {
      started: this.started,
      userId: this.userId,
      orgId: this.orgId,
      channelCount: (this.userChannel ? 1 : 0) + (this.presenceChannel ? 1 : 0) + this.threadSubs.size * 2,
      threadCount: this.threadSubs.size,
      threadIds: Array.from(this.threadSubs.keys()),
      handlerCount: this.handlers.size,
      presenceStatus: this.lastPresenceStatus,
      lastHeartbeat: this.lastHeartbeatAt || null,
      tabRole: this.isLeaderTab ? "leader" : "follower",
      duplicateSignalsBlocked: this.duplicateSignalsBlocked,
    };
  }

  // ── Accessors ──

  get isStarted() { return this.started; }
  get currentUserId() { return this.userId; }
  get channelCount() { return (this.userChannel ? 1 : 0) + (this.presenceChannel ? 1 : 0) + this.threadSubs.size * 2; }
}

/** Singleton instance */
export const realtimeManager = new RealtimeManager();
