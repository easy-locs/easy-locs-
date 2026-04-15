import "@testing-library/jest-dom";
import { vi, beforeEach, afterEach } from "vitest";
import { createMockSupabase } from "@/test/__mocks__/supabase";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: createMockSupabase(),
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

HTMLCanvasElement.prototype.getContext = (() => null) as any;
HTMLCanvasElement.prototype.toDataURL = (() => "") as any;

if (!window.IntersectionObserver) {
  (window as any).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (!window.ResizeObserver) {
  (window as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (typeof window.URL.createObjectURL !== "function") {
  window.URL.createObjectURL = () => "blob:mock";
  window.URL.revokeObjectURL = () => {};
}

if (typeof globalThis.requestIdleCallback !== "function") {
  (globalThis as any).requestIdleCallback = (cb: IdleRequestCallback) => {
    const start = Date.now();
    return setTimeout(() => cb({ didTimeout: false, timeRemaining: () => Math.max(0, 50 - (Date.now() - start)) } as IdleDeadline), 1) as unknown as number;
  };
  (globalThis as any).cancelIdleCallback = (id: number) => clearTimeout(id);
}

if (typeof globalThis.requestAnimationFrame !== "function") {
  (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0) as unknown as number;
  (globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
}

interface Resettable { reset(): void }
interface PlatformBus { clear(): void; clearLogs(): void }
interface SupabaseMock { removeAllChannels: () => void }
interface QueryClientLike { clear(): void }

let _platformBus: PlatformBus | null = null;
let _resetAllStores: (() => void) | null = null;
let _supabaseMock: SupabaseMock | null = null;
let _queryClient: QueryClientLike | null = null;
let _engineOrchestrator: Resettable | null = null;
let _engineObserver: Resettable | null = null;

try {
  const mod = await import("@/lib/shared/platform-bus");
  _platformBus = mod.platformBus as PlatformBus;
} catch {}

try {
  const mod = await import("@/test/reset-stores");
  _resetAllStores = mod.resetAllStores;
} catch {}

try {
  const mod = await import("@/integrations/supabase/client");
  _supabaseMock = mod.supabase as unknown as SupabaseMock;
} catch {}

try {
  const mod = await import("@/lib/query-client");
  _queryClient = mod.queryClient as QueryClientLike;
} catch {}

try {
  const mod = await import("@/engines/core/engine-orchestrator");
  _engineOrchestrator = mod.engineOrchestrator as Resettable;
} catch {}

try {
  const mod = await import("@/engines/core/engine-observer");
  _engineObserver = mod.engineObserver as Resettable;
} catch {}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();

  if (_platformBus) {
    _platformBus.clear();
    _platformBus.clearLogs();
  }

  if (_resetAllStores) {
    _resetAllStores();
  }

  if (_queryClient) {
    _queryClient.clear();
  }

  if (_engineOrchestrator) {
    _engineOrchestrator.reset();
  }

  if (_engineObserver) {
    _engineObserver.reset();
  }

  vi.clearAllMocks();
});

afterEach(() => {
  if (_supabaseMock?.removeAllChannels) {
    _supabaseMock.removeAllChannels();
  }

  vi.useRealTimers();
});
