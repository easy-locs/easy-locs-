export type DebugDomain =
  | "call"
  | "qr"
  | "share"
  | "geo"
  | "realtime"
  | "router"
  | "wallet"
  | "system"
  | "address";

export type DebugLevel = "info" | "warn" | "error" | "success";

export interface DebugEventItem {
  id: string;
  domain: DebugDomain;
  level: DebugLevel;
  label: string;
  detail?: string;
  data?: unknown;
  createdAt: string;
}

const STORAGE_KEY = "el_runtime_debug_events_v1";
const MAX_EVENTS = 200;

let events: DebugEventItem[] = [];
const listeners = new Set<(items: DebugEventItem[]) => void>();

function uid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
  } catch {}
}

function notify() {
  listeners.forEach((fn) => fn([...events]));
}

export function loadDebugEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    events = JSON.parse(raw) as DebugEventItem[];
    return [...events];
  } catch {
    return [];
  }
}

export function pushDebugEvent(input: Omit<DebugEventItem, "id" | "createdAt">) {
  const item: DebugEventItem = {
    id: uid(),
    createdAt: new Date().toISOString(),
    ...input,
  };
  events = [item, ...events].slice(0, MAX_EVENTS);
  persist();
  notify();
  return item;
}

export function clearDebugEvents() {
  events = [];
  persist();
  notify();
}

export function subscribeDebugEvents(fn: (items: DebugEventItem[]) => void) {
  listeners.add(fn);
  fn([...events]);
  return () => listeners.delete(fn);
}

export const debugLog = {
  info(domain: DebugDomain, label: string, detail?: string, data?: unknown) {
    pushDebugEvent({ domain, level: "info", label, detail, data });
  },
  warn(domain: DebugDomain, label: string, detail?: string, data?: unknown) {
    pushDebugEvent({ domain, level: "warn", label, detail, data });
  },
  error(domain: DebugDomain, label: string, detail?: string, data?: unknown) {
    pushDebugEvent({ domain, level: "error", label, detail, data });
  },
  success(domain: DebugDomain, label: string, detail?: string, data?: unknown) {
    pushDebugEvent({ domain, level: "success", label, detail, data });
  },
};
