/**
 * Prefetch Engine — Intelligent preloading of conversations and media.
 * Loads data before the user needs it based on usage patterns.
 * Enhanced with data prefetching on hover for key sections.
 */

import { connectionManager } from "@/lib/network/connection-manager";
import { getNetworkProfile } from "@/lib/network/network-adapter";

type PrefetchFn = () => Promise<void>;

interface PrefetchTask {
  key: string;
  fn: PrefetchFn;
  priority: number;
  lastFetched: number;
  ttlMs: number;
}

class PrefetchEngine {
  private tasks = new Map<string, PrefetchTask>();
  private running = false;

  register(key: string, fn: PrefetchFn, opts?: { priority?: number; ttlMs?: number }): void {
    this.tasks.set(key, {
      key,
      fn,
      priority: opts?.priority ?? 5,
      lastFetched: 0,
      ttlMs: opts?.ttlMs ?? 60000,
    });
  }

  unregister(key: string): void {
    this.tasks.delete(key);
  }

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

      const batchSize = profile.quality === "good" ? 5 : 2;

      for (let i = 0; i < eligible.length; i += batchSize) {
        if (!connectionManager.isOnline()) break;
        const batch = eligible.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map(async task => {
            try {
              await task.fn();
              task.lastFetched = Date.now();
            } catch {}
          })
        );
      }
    } finally {
      this.running = false;
    }
  }

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

  async prefetchWalletBalance(userId: string): Promise<void> {
    if (!connectionManager.isOnline()) return;
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase
        .from("wallet_accounts")
        .select("id, available_balance, currency, status")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1);
    } catch {}
  }

  async prefetchDiscovery(): Promise<void> {
    if (!connectionManager.isOnline()) return;
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase
        .from("storefront_pages")
        .select("id, name, slug, logo_url, vertical, city, rating")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(30);
    } catch {}
  }
}

export const prefetchEngine = new PrefetchEngine();
