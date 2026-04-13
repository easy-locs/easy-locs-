import { platformBus } from "@/lib/shared/platform-bus";
import { queryClient } from "@/lib/query-client";

type Module = "dashboard" | "radar" | "orbit" | "wallet" | "me";

interface ModuleState {
  lastActive: number;
  dataFreshUntil: number;
  pendingRefresh: boolean;
}

const STALE_MS = 60_000;

const state: Record<Module, ModuleState> = {
  dashboard: { lastActive: 0, dataFreshUntil: 0, pendingRefresh: false },
  radar: { lastActive: 0, dataFreshUntil: 0, pendingRefresh: false },
  orbit: { lastActive: 0, dataFreshUntil: 0, pendingRefresh: false },
  wallet: { lastActive: 0, dataFreshUntil: 0, pendingRefresh: false },
  me: { lastActive: 0, dataFreshUntil: 0, pendingRefresh: false },
};

const MODULE_QUERY_KEYS: Record<Module, string[][]> = {
  dashboard: [["dashboard-live-stats"], ["trending"], ["best-rated"], ["near-you"]],
  radar: [["radar-places"], ["radar-categories"]],
  orbit: [["threads"], ["orbit-contacts"]],
  wallet: [["wallet-balance"], ["wallet-transactions"]],
  me: [["user-profile"], ["user-settings"]],
};

const CROSS_REFRESH_MAP: Record<string, Module[]> = {
  "wallet:transfer_completed": ["dashboard", "orbit", "wallet"],
  "wallet:balance_updated": ["dashboard", "wallet"],
  "wallet:payment_completed": ["dashboard", "wallet", "orbit"],
  "orbit:message_received": ["dashboard", "orbit"],
  "orbit:message_sent": ["dashboard"],
  "marketplace:booking_confirmed": ["dashboard", "wallet", "orbit"],
  "ORDER_CREATED": ["dashboard", "wallet"],
  "dashboard:counters_refresh": ["dashboard"],
};

function markModuleActive(mod: Module) {
  const now = Date.now();
  const s = state[mod];
  s.lastActive = now;

  if (s.pendingRefresh || now > s.dataFreshUntil) {
    refreshModuleData(mod);
    s.pendingRefresh = false;
  }
}

function refreshModuleData(mod: Module) {
  const keys = MODULE_QUERY_KEYS[mod];
  if (!keys) return;

  for (const key of keys) {
    queryClient.invalidateQueries({ queryKey: key });
  }
  state[mod].dataFreshUntil = Date.now() + STALE_MS;
}

let _debounceTimers: Partial<Record<Module, ReturnType<typeof setTimeout>>> = {};

function markModuleStale(mod: Module) {
  const s = state[mod];
  const now = Date.now();

  if (now - s.lastActive < 5000) {
    if (_debounceTimers[mod]) clearTimeout(_debounceTimers[mod]);
    _debounceTimers[mod] = setTimeout(() => {
      refreshModuleData(mod);
      delete _debounceTimers[mod];
    }, 300);
  } else {
    s.pendingRefresh = true;
    s.dataFreshUntil = 0;
  }
}

function handleCrossModuleEvent(eventType: string) {
  const targets = CROSS_REFRESH_MAP[eventType];
  if (!targets) return;

  for (const mod of targets) {
    markModuleStale(mod);
  }
}

let _installed = false;

export function installModuleIntelligence() {
  if (_installed) return;
  _installed = true;

  for (const eventType of Object.keys(CROSS_REFRESH_MAP)) {
    platformBus.on(eventType, () => handleCrossModuleEvent(eventType));
  }

}

export function onModuleEnter(mod: Module) {
  markModuleActive(mod);
}

export function onModuleLeave(mod: Module) {
  state[mod].lastActive = Date.now();
}

export function getModuleState(): Record<Module, ModuleState> {
  return { ...state };
}
