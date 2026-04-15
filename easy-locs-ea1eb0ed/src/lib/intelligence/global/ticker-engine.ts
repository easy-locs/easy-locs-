import type { CanonicalGlobalFeedItem } from "@/domains/shared/canonical-types";
import { isPlatformFlagEnabled } from "@/lib/growth/feature-flag-registry";
import { isFeatureEnabled } from "@/lib/control-plane/kill-switches";
import type { PlatformFlag } from "@/lib/growth/feature-flag-registry";
import { fetchFromAllProviders, listProviders } from "./provider-adapter";
import { rankFeedItems, filterExpired, deduplicateByHash, topN } from "./feed-ranking-engine";
import type { RankedFeedItem } from "./feed-ranking-engine";

const MASTER_FLAG: PlatformFlag = "enable_global_intelligence";
const TICKER_FLAG: PlatformFlag = "enable_intelligence_ticker";
const KILL_SWITCH = "intelligence_enabled";

const TICKER_POOL_SIZE = 20;
const FORBIDDEN_CATEGORIES = new Set(["local_utility", "forex"]);

export interface TickerItem {
  id: string;
  text: string;
  category: string;
  priority: string;
  country: string;
  city: string | null;
  compositeScore: number;
  expiresAt: string;
  source: string | null;
  deepLinkUrl: string | null;
}

export interface TickerState {
  items: TickerItem[];
  currentIndex: number;
  lastRefreshedAt: string;
  country: string;
  city: string | null;
  gated: boolean;
  gateReason: string | null;
}

function isGated(): { gated: true; reason: string } | { gated: false } {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return { gated: true, reason: "master_flag_off" };
  if (!isPlatformFlagEnabled(TICKER_FLAG)) return { gated: true, reason: "ticker_flag_off" };
  if (!isFeatureEnabled(KILL_SWITCH)) return { gated: true, reason: "kill_switch_off" };
  return { gated: false };
}

function toTickerItem(ranked: RankedFeedItem): TickerItem {
  const item = ranked.item;
  return {
    id: item.id,
    text: item.summary || item.title,
    category: item.category,
    priority: item.priority,
    country: item.country,
    city: item.city,
    compositeScore: ranked.compositeScore,
    expiresAt: item.expiresAt,
    source: item.sourceName ?? null,
    deepLinkUrl: item.deepLinkUrl ?? null,
  };
}

function composeTickerInternal(country: string, city?: string, bypassKillSwitch = false): TickerState {
  if (!bypassKillSwitch) {
    const gate = isGated();
    if (gate.gated) {
      return {
        items: [],
        currentIndex: 0,
        lastRefreshedAt: new Date().toISOString(),
        country,
        city: city ?? null,
        gated: true,
        gateReason: gate.reason,
      };
    }
  } else {
    if (!isPlatformFlagEnabled(MASTER_FLAG)) {
      return {
        items: [],
        currentIndex: 0,
        lastRefreshedAt: new Date().toISOString(),
        country,
        city: city ?? null,
        gated: true,
        gateReason: "master_flag_off",
      };
    }
    if (!isPlatformFlagEnabled(TICKER_FLAG)) {
      return {
        items: [],
        currentIndex: 0,
        lastRefreshedAt: new Date().toISOString(),
        country,
        city: city ?? null,
        gated: true,
        gateReason: "ticker_flag_off",
      };
    }
  }

  const providers = listProviders();
  if (providers.length === 0) {
    return {
      items: [],
      currentIndex: 0,
      lastRefreshedAt: new Date().toISOString(),
      country,
      city: city ?? null,
      gated: false,
      gateReason: null,
    };
  }

  const rawItems = fetchFromAllProviders(country, city);
  const deduped = deduplicateByHash(rawItems);
  const ranked = rankFeedItems(deduped);
  const live = filterExpired(ranked);
  const filtered = live.filter(r => !FORBIDDEN_CATEGORIES.has(r.item.category));
  const pool = topN(filtered, TICKER_POOL_SIZE);

  return {
    items: pool.map(toTickerItem),
    currentIndex: 0,
    lastRefreshedAt: new Date().toISOString(),
    country,
    city: city ?? null,
    gated: false,
    gateReason: null,
  };
}

export function composeTicker(country: string, city?: string): TickerState {
  return composeTickerInternal(country, city, false);
}

export function composeTickerBypassKillSwitch(country: string, city?: string): TickerState {
  return composeTickerInternal(country, city, true);
}

export function advanceTicker(state: TickerState): TickerState {
  if (state.items.length === 0) return state;
  const now = Date.now();
  const liveItems = state.items.filter(i => new Date(i.expiresAt).getTime() > now);
  if (liveItems.length === 0) return { ...state, items: [], currentIndex: 0 };
  const nextIndex = (state.currentIndex + 1) % liveItems.length;
  return { ...state, items: liveItems, currentIndex: nextIndex };
}

export function getCurrentTickerItem(state: TickerState): TickerItem | null {
  if (state.gated || state.items.length === 0) return null;
  return state.items[state.currentIndex] ?? null;
}

export function isTickerAvailable(): boolean {
  const gate = isGated();
  return !gate.gated;
}
