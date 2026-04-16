import { connectionManager } from "@/lib/network/connection-manager";
import { getNetworkProfile } from "@/lib/network/network-adapter";
import { navigationPredictor } from "@/lib/performance/predictive-preloader";

type PrefetchFn = () => Promise<void>;

interface PrefetchTask {
  key: string;
  fn: PrefetchFn;
  priority: number;
  lastFetched: number;
  ttlMs: number;
}

interface NavigationTransition {
  from: string;
  to: string;
  timestamp: number;
}

interface RouteTransitionProbability {
  route: string;
  probability: number;
  count: number;
}

const TRANSITION_STORAGE_KEY = "el_nav_transitions";
const MAX_STORED_TRANSITIONS = 50;
const PREFETCH_PROBABILITY_THRESHOLD = 0.3;

class PrefetchEngine {
  private tasks = new Map<string, PrefetchTask>();
  private running = false;
  private routeModules = new Map<string, () => Promise<unknown>>();
  private prefetchedRoutes = new Set<string>();

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

  registerRouteModule(route: string, loader: () => Promise<unknown>): void {
    this.routeModules.set(route, loader);
  }

  recordNavigation(from: string, to: string): void {
    const transition: NavigationTransition = {
      from: this.normalizePath(from),
      to: this.normalizePath(to),
      timestamp: Date.now(),
    };

    try {
      const stored = this.getStoredTransitions();
      stored.push(transition);
      if (stored.length > MAX_STORED_TRANSITIONS) {
        stored.splice(0, stored.length - MAX_STORED_TRANSITIONS);
      }
      sessionStorage.setItem(TRANSITION_STORAGE_KEY, JSON.stringify(stored));
    } catch {}

    this.predictAndPrefetch(transition.to);
  }

  getTransitionProbabilities(fromRoute: string): RouteTransitionProbability[] {
    const normalized = this.normalizePath(fromRoute);
    const transitions = this.getStoredTransitions();

    const fromTransitions = transitions.filter((t) => t.from === normalized);
    if (fromTransitions.length === 0) return [];

    const counts = new Map<string, number>();
    for (const t of fromTransitions) {
      counts.set(t.to, (counts.get(t.to) ?? 0) + 1);
    }

    const total = fromTransitions.length;
    const probabilities: RouteTransitionProbability[] = [];

    for (const [route, count] of counts) {
      probabilities.push({
        route,
        probability: count / total,
        count,
      });
    }

    return probabilities.sort((a, b) => b.probability - a.probability);
  }

  private async predictAndPrefetch(currentRoute: string): Promise<void> {
    if (!this.isConnectionSuitable()) return;

    const probabilities = this.getTransitionProbabilities(currentRoute);
    const toPrefetch = probabilities.filter(
      (p) =>
        p.probability >= PREFETCH_PROBABILITY_THRESHOLD &&
        !this.prefetchedRoutes.has(p.route),
    );

    if (toPrefetch.length === 0) return;

    const idle =
      typeof requestIdleCallback !== "undefined"
        ? (fn: () => void) => requestIdleCallback(fn, { timeout: 3000 })
        : (fn: () => void) => setTimeout(fn, 100);

    idle(() => {
      for (const target of toPrefetch) {
        const loader = this.findRouteLoader(target.route);
        if (loader) {
          loader()
            .then(() => {
              this.prefetchedRoutes.add(target.route);
            })
            .catch(() => {});
        }
      }
    });
  }

  private findRouteLoader(route: string): (() => Promise<unknown>) | null {
    if (this.routeModules.has(route)) {
      return this.routeModules.get(route)!;
    }

    for (const [pattern, loader] of this.routeModules) {
      if (route.startsWith(pattern)) {
        return loader;
      }
    }

    return null;
  }

  private isConnectionSuitable(): boolean {
    if (!connectionManager.isOnline()) return false;

    const nav = navigator as Navigator & {
      connection?: { effectiveType?: string; saveData?: boolean };
    };
    if (nav.connection?.saveData) return false;
    const effectiveType = nav.connection?.effectiveType;
    if (effectiveType === "slow-2g" || effectiveType === "2g") return false;

    return true;
  }

  private normalizePath(path: string): string {
    return path
      .replace(/\/[0-9a-f-]{36}/g, "/:id")
      .replace(/\/\d+/g, "/:id")
      .replace(/\?.*$/, "")
      .replace(/\/$/, "") || "/";
  }

  private getStoredTransitions(): NavigationTransition[] {
    try {
      const raw = sessionStorage.getItem(TRANSITION_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as NavigationTransition[];
    } catch {
      return [];
    }
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

  async runPredictive(currentPath: string): Promise<void> {
    if (!connectionManager.isOnline()) return;
    const profile = getNetworkProfile();
    if (profile.quality === "poor" || profile.quality === "offline") return;

    const predictions = navigationPredictor.predict(currentPath);
    if (predictions.length === 0) return;

    for (const pred of predictions) {
      if (pred.confidence < 0.2) continue;
      const matchingTasks = Array.from(this.tasks.values())
        .filter(t => t.key.includes(pred.route) || pred.route.includes(t.key));
      for (const task of matchingTasks) {
        const now = Date.now();
        if (now - task.lastFetched > task.ttlMs) {
          try {
            await task.fn();
            task.lastFetched = Date.now();
          } catch {}
        }
      }
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

  clearPrefetchCache(): void {
    this.prefetchedRoutes.clear();
  }

  getStats(): {
    registeredTasks: number;
    prefetchedRoutes: number;
    storedTransitions: number;
  } {
    return {
      registeredTasks: this.tasks.size,
      prefetchedRoutes: this.prefetchedRoutes.size,
      storedTransitions: this.getStoredTransitions().length,
    };
  }
}

export const prefetchEngine = new PrefetchEngine();
