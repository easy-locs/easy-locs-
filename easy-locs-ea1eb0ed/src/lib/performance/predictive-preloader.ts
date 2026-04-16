const MAX_HISTORY = 200;
const MAX_PREDICTIONS = 3;
const MIN_CONFIDENCE = 0.15;
const DECAY_FACTOR = 0.95;

interface TransitionRecord {
  from: string;
  to: string;
  timestamp: number;
  weight: number;
}

interface PredictionResult {
  route: string;
  confidence: number;
}

class NavigationPredictor {
  private history: TransitionRecord[] = [];
  private transitionCounts = new Map<string, Map<string, number>>();
  private totalFromCounts = new Map<string, number>();
  private storageKey = "easylocs:nav-patterns";

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(this.storageKey);
      if (!raw) return;
      const data = JSON.parse(raw) as TransitionRecord[];
      for (const record of data) {
        this.recordTransitionInternal(record.from, record.to, record.weight);
      }
      this.history = data.slice(-MAX_HISTORY);
    } catch {
      // ignore
    }
  }

  private saveToStorage(): void {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(
        this.storageKey,
        JSON.stringify(this.history.slice(-MAX_HISTORY)),
      );
    } catch {
      // ignore
    }
  }

  private normalizePath(path: string): string {
    const base = path.split("?")[0].split("#")[0];
    return base.replace(/\/[0-9a-f]{8,}(-[0-9a-f]+)*/gi, "/:id")
      .replace(/\/\d+/g, "/:id");
  }

  private recordTransitionInternal(from: string, to: string, weight: number): void {
    if (!this.transitionCounts.has(from)) {
      this.transitionCounts.set(from, new Map());
    }
    const fromMap = this.transitionCounts.get(from)!;
    fromMap.set(to, (fromMap.get(to) ?? 0) + weight);
    this.totalFromCounts.set(from, (this.totalFromCounts.get(from) ?? 0) + weight);
  }

  recordNavigation(from: string, to: string): void {
    const normFrom = this.normalizePath(from);
    const normTo = this.normalizePath(to);
    if (normFrom === normTo) return;

    const record: TransitionRecord = {
      from: normFrom,
      to: normTo,
      timestamp: Date.now(),
      weight: 1,
    };

    this.history.push(record);
    if (this.history.length > MAX_HISTORY) this.history.shift();

    this.recordTransitionInternal(normFrom, normTo, 1);
    this.applyDecay();
    this.saveToStorage();
  }

  private applyDecay(): void {
    if (this.history.length % 50 !== 0) return;

    for (const [from, toMap] of this.transitionCounts) {
      for (const [to, count] of toMap) {
        const decayed = count * DECAY_FACTOR;
        if (decayed < 0.01) {
          toMap.delete(to);
        } else {
          toMap.set(to, decayed);
        }
      }
      if (toMap.size === 0) {
        this.transitionCounts.delete(from);
        this.totalFromCounts.delete(from);
      } else {
        let total = 0;
        for (const v of toMap.values()) total += v;
        this.totalFromCounts.set(from, total);
      }
    }
  }

  predict(currentPath: string): PredictionResult[] {
    const norm = this.normalizePath(currentPath);
    const toMap = this.transitionCounts.get(norm);
    if (!toMap) return [];

    const total = this.totalFromCounts.get(norm) ?? 0;
    if (total === 0) return [];

    const predictions: PredictionResult[] = [];
    for (const [route, count] of toMap) {
      const confidence = count / total;
      if (confidence >= MIN_CONFIDENCE) {
        predictions.push({ route, confidence });
      }
    }

    predictions.sort((a, b) => b.confidence - a.confidence);
    return predictions.slice(0, MAX_PREDICTIONS);
  }

  getPillarForRoute(route: string): string | null {
    if (route.startsWith("/dashboard") || route === "/") return "dashboard";
    if (route.startsWith("/radar") || route.startsWith("/explore") || route.startsWith("/browse") || route.startsWith("/discover") || route.startsWith("/travel") || route.startsWith("/mobility") || route.startsWith("/food")) return "radar";
    if (route.startsWith("/orbit")) return "orbit";
    if (route.startsWith("/wallet") || route.startsWith("/pay") || route.startsWith("/checkout") || route.startsWith("/orders")) return "wallet";
    if (route.startsWith("/me") || route.startsWith("/settings") || route.startsWith("/merchant") || route.startsWith("/driver") || route.startsWith("/favorites")) return "me";
    return null;
  }

  getStats(): { totalTransitions: number; uniqueRoutes: number; topRoutes: Array<{ route: string; visits: number }> } {
    const routeVisits = new Map<string, number>();
    for (const record of this.history) {
      routeVisits.set(record.to, (routeVisits.get(record.to) ?? 0) + 1);
    }

    const topRoutes = Array.from(routeVisits.entries())
      .map(([route, visits]) => ({ route, visits }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 10);

    return {
      totalTransitions: this.history.length,
      uniqueRoutes: routeVisits.size,
      topRoutes,
    };
  }

  clear(): void {
    this.history = [];
    this.transitionCounts.clear();
    this.totalFromCounts.clear();
    if (typeof window !== "undefined") {
      try { sessionStorage.removeItem(this.storageKey); } catch {}
    }
  }
}

export const navigationPredictor = new NavigationPredictor();
export type { PredictionResult };
