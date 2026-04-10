/**
 * SmartCore — Unified intelligence layer for Easy-Locs.
 * Tracks feature usage, page performance, flow completion rates.
 * Persists insights to localStorage for cross-session intelligence.
 * Consumers use useSmartInsights() hook.
 */

const STORAGE_KEY = "el_smart_core";
const MAX_HISTORY = 200;
const DECAY_FACTOR = 0.95;

export interface FeatureUsage {
  route: string;
  count: number;
  lastUsed: number;
  avgDwell: number;
  score: number;
}

export interface FlowMetric {
  flowId: string;
  started: number;
  completed: number;
  abandoned: number;
  avgDuration: number;
}

export interface SmartCoreState {
  featureUsage: Record<string, FeatureUsage>;
  flowMetrics: Record<string, FlowMetric>;
  sessionCount: number;
  lastSession: number;
  topRoutes: string[];
  suggestions: SmartSuggestion[];
}

export interface SmartSuggestion {
  id: string;
  type: "profile" | "feature" | "performance" | "engagement";
  titleKey: string;
  descKey: string;
  route: string;
  priority: number;
  dismissed: boolean;
}

function getDefault(): SmartCoreState {
  return {
    featureUsage: {},
    flowMetrics: {},
    sessionCount: 0,
    lastSession: 0,
    topRoutes: [],
    suggestions: [],
  };
}

let _state: SmartCoreState | null = null;

function load(): SmartCoreState {
  if (_state) return _state;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      _state = JSON.parse(raw) as SmartCoreState;
      return _state;
    }
  } catch {}
  _state = getDefault();
  return _state;
}

function pruneHistory(): void {
  if (!_state) return;
  const entries = Object.entries(_state.featureUsage);
  if (entries.length > MAX_HISTORY) {
    entries.sort((a, b) => b[1].score - a[1].score);
    _state.featureUsage = Object.fromEntries(entries.slice(0, MAX_HISTORY));
  }
}

function persist(): void {
  if (!_state) return;
  pruneHistory();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch {}
}

export function trackRouteVisit(route: string): void {
  const state = load();
  const now = Date.now();
  const existing = state.featureUsage[route];

  if (existing) {
    const recency = 1 - Math.min((now - existing.lastUsed) / 86400000, 1);
    existing.count += 1;
    existing.lastUsed = now;
    existing.score = existing.count * DECAY_FACTOR + recency * 10;
  } else {
    state.featureUsage[route] = {
      route,
      count: 1,
      lastUsed: now,
      avgDwell: 0,
      score: 1,
    };
  }

  state.topRoutes = Object.values(state.featureUsage)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(f => f.route);

  persist();
}

export function trackDwell(route: string, durationMs: number): void {
  const state = load();
  const existing = state.featureUsage[route];
  if (existing) {
    existing.avgDwell = existing.avgDwell
      ? (existing.avgDwell * 0.7 + durationMs * 0.3)
      : durationMs;
    persist();
  }
}

export function trackFlowStart(flowId: string): void {
  const state = load();
  if (!state.flowMetrics[flowId]) {
    state.flowMetrics[flowId] = { flowId, started: 0, completed: 0, abandoned: 0, avgDuration: 0 };
  }
  state.flowMetrics[flowId].started += 1;
  persist();
}

export function trackFlowComplete(flowId: string, durationMs: number): void {
  const state = load();
  const metric = state.flowMetrics[flowId];
  if (metric) {
    metric.completed += 1;
    metric.avgDuration = metric.avgDuration
      ? (metric.avgDuration * 0.7 + durationMs * 0.3)
      : durationMs;
  }
  persist();
}

export function trackFlowAbandon(flowId: string): void {
  const state = load();
  const metric = state.flowMetrics[flowId];
  if (metric) {
    metric.abandoned += 1;
  }
  persist();
}

export function startSession(): void {
  const state = load();
  state.sessionCount += 1;
  state.lastSession = Date.now();
  Object.values(state.featureUsage).forEach(f => {
    f.score *= DECAY_FACTOR;
  });
  persist();
}

export function getTopRoutes(limit = 6): string[] {
  const state = load();
  return state.topRoutes.slice(0, limit);
}

export function getFeatureScore(route: string): number {
  const state = load();
  return state.featureUsage[route]?.score ?? 0;
}

export function getFlowHealth(flowId: string): { completionRate: number; avgDuration: number } | null {
  const state = load();
  const m = state.flowMetrics[flowId];
  if (!m || m.started === 0) return null;
  return {
    completionRate: m.completed / m.started,
    avgDuration: m.avgDuration,
  };
}

export function generateSuggestions(context: {
  hasShop: boolean;
  hasWallet: boolean;
  hasProfile: boolean;
  profileComplete: boolean;
  hasOrbit: boolean;
}): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];
  const state = load();

  if (!context.hasShop) {
    suggestions.push({
      id: "open-shop",
      type: "feature",
      titleKey: "smart.suggest_open_shop",
      descKey: "smart.suggest_open_shop_desc",
      route: "/merchant/onboarding",
      priority: 80,
      dismissed: false,
    });
  }

  if (!context.hasWallet) {
    suggestions.push({
      id: "setup-wallet",
      type: "feature",
      titleKey: "smart.suggest_wallet",
      descKey: "smart.suggest_wallet_desc",
      route: "/wallet",
      priority: 90,
      dismissed: false,
    });
  }

  if (!context.profileComplete) {
    suggestions.push({
      id: "complete-profile",
      type: "profile",
      titleKey: "smart.suggest_profile",
      descKey: "smart.suggest_profile_desc",
      route: "/settings/account",
      priority: 85,
      dismissed: false,
    });
  }

  if (!context.hasOrbit) {
    suggestions.push({
      id: "try-orbit",
      type: "engagement",
      titleKey: "smart.suggest_orbit",
      descKey: "smart.suggest_orbit_desc",
      route: "/orbit",
      priority: 70,
      dismissed: false,
    });
  }

  const flowHealth = Object.entries(state.flowMetrics);
  for (const [flowId, metric] of flowHealth) {
    if (metric.started > 3 && metric.abandoned / metric.started > 0.5) {
      suggestions.push({
        id: `flow-help-${flowId}`,
        type: "performance",
        titleKey: "smart.suggest_flow_help",
        descKey: "smart.suggest_flow_help_desc",
        route: "/settings/support",
        priority: 60,
        dismissed: false,
      });
    }
  }

  const dismissed = new Set(state.suggestions.filter(s => s.dismissed).map(s => s.id));
  state.suggestions = suggestions.filter(s => !dismissed.has(s.id));
  persist();

  return state.suggestions.sort((a, b) => b.priority - a.priority);
}

export function dismissSuggestion(id: string): void {
  const state = load();
  const s = state.suggestions.find(s => s.id === id);
  if (s) s.dismissed = true;
  persist();
}

export function getSmartCoreState(): SmartCoreState {
  return load();
}
