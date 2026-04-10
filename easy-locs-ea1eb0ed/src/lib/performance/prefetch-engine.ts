/**
 * Prefetch Engine — Intelligent preloading of conversations and media.
 * Loads data before the user needs it based on usage patterns.
 */

import { connectionManager } from "@/lib/network/connection-manager";
import { getNetworkProfile } from "@/lib/network/network-adapter";

type PrefetchFn = () => Promise<void>;

interface PrefetchTask {
  key: string;
  fn: PrefetchFn;
  priority: number; // lower = higher priority
  lastFetched: number;
  ttlMs: number;
}

class PrefetchEngine {
  private tasks = new Map<string, PrefetchTask>();
  private running = false;

  /** Register a prefetch task */
  register(key: string, fn: PrefetchFn, opts?: { priority?: number; ttlMs?: number }): void {
    this.tasks.set(key, {
      key,
      fn,
      priority: opts?.priority ?? 5,
      lastFetched: 0,
      ttlMs: opts?.ttlMs ?? 60000, // 1 minute default
    });
  }

  /** Remove a prefetch task */
  unregister(key: string): void {
    this.tasks.delete(key);
  }

  /** Run all eligible prefetch tasks */
  async run(): Promise<void> {
    if (this.running) return;
    if (!connectionManager.isOnline()) return;

    const profile = getNetworkProfile();
    if (profile.quality === "poor" || profile.quality === "offline") return;

    this.running = true;
    try {
      const now = Date.now();
      const eligible = Array.from(this.tasks.values())
        .filter(t => now - t.lastFetched > t.ttlMs)
        .sort((a, b) => a.priority - b.priority);

      for (const task of eligible) {
        if (!connectionManager.isOnline()) break;
        try {
          await task.fn();
          task.lastFetched = Date.now();
        } catch {}
      }
    } finally {
      this.running = false;
    }
  }

  /** Prefetch a specific conversation's recent messages */
  async prefetchConversation(conversationId: string): Promise<void> {
    if (!connectionManager.isOnline()) return;
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase
        .from("chat_messages_v2")
        .select("id, body, type, created_at, sender_user_id")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(30);
    } catch {}
  }
}

// Singleton
export const prefetchEngine = new PrefetchEngine();
