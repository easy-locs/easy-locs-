/**
 * PASS55 Block AP — Advanced Testing Utilities
 * Mock factories, integration test helpers, and assertion utilities.
 */

// ─── Mock Factories ─────────────────────────────────────────────────────────

/** Create a mock Supabase response */
export function mockSupabaseResponse<T>(data: T, error: null | { message: string; code?: string } = null) {
  return { data, error, count: Array.isArray(data) ? data.length : null, status: error ? 400 : 200, statusText: error ? "Bad Request" : "OK" };
}

/** Create a mock user profile */
export function mockProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    full_name: "Test User",
    email: `test-${Date.now()}@example.com`,
    user_type: "owner",
    avatar_url: null,
    phone: "+33612345678",
    preferred_locale: "fr",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/** Create a mock organization */
export function mockOrg(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    name: "Test Org",
    owner_user_id: crypto.randomUUID(),
    email: "org@example.com",
    country: "FR",
    currency: "EUR",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/** Create a mock property */
export function mockProperty(orgId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    org_id: orgId,
    label: "Apt 42",
    address: "123 Rue de Test",
    city: "Paris",
    country: "FR",
    surface: 65,
    rooms: 3,
    furnished: true,
    photo_urls: [],
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/** Create a mock tenant */
export function mockTenant(orgId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    org_id: orgId,
    name: "Jean Dupont",
    email: "jean@test.com",
    phone: "+33600000000",
    status: "active",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/** Create a mock notification */
export function mockNotification(userId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    org_id: crypto.randomUUID(),
    type: "info" as const,
    title: "Test notification",
    message: "This is a test",
    read: false,
    link: "/dashboard",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/** Create a mock wallet transaction */
export function mockTransaction(userId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    type: "transfer",
    direction: "out",
    amount: 100,
    currency: "LOCS",
    description: "Test transfer",
    status: "completed",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ─── Async Test Helpers ──────────────────────────────────────────────────────

/** Wait for a condition to become true (polling) */
export async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  opts: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 50 } = opts;
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await predicate()) return;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`waitFor timed out after ${timeout}ms`);
}

/** Collect events from an EventTarget during an action */
export async function collectEvents<T extends Event>(
  target: EventTarget,
  eventName: string,
  action: () => void | Promise<void>,
  opts: { timeout?: number } = {}
): Promise<T[]> {
  const { timeout = 2000 } = opts;
  const events: T[] = [];
  const handler = (e: Event) => events.push(e as T);
  target.addEventListener(eventName, handler);
  try {
    await action();
    await new Promise((r) => setTimeout(r, timeout));
  } finally {
    target.removeEventListener(eventName, handler);
  }
  return events;
}

// ─── Spy / Stub Utilities ────────────────────────────────────────────────────

/** Simple function spy that records calls */
export function createSpy<T extends (...args: any[]) => any>(
  impl?: T
): T & { calls: Parameters<T>[]; callCount: number; lastCall: Parameters<T> | undefined; reset: () => void } {
  const calls: Parameters<T>[] = [];
  const spy = ((...args: any[]) => {
    calls.push(args as Parameters<T>);
    return impl?.(...args);
  }) as any;
  Object.defineProperty(spy, "calls", { get: () => calls });
  Object.defineProperty(spy, "callCount", { get: () => calls.length });
  Object.defineProperty(spy, "lastCall", { get: () => calls[calls.length - 1] });
  spy.reset = () => { calls.length = 0; };
  return spy;
}

/** Create a deferred promise for controlling async flow in tests */
export function createDeferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

// ─── Assertion Helpers ───────────────────────────────────────────────────────

/** Assert a value is defined (non-null, non-undefined) */
export function assertDefined<T>(value: T | null | undefined, label = "value"): asserts value is T {
  if (value === null || value === undefined) throw new Error(`Expected ${label} to be defined, got ${value}`);
}

/** Assert arrays have same elements (order-independent) */
export function assertSameElements<T>(actual: T[], expected: T[], label = "array") {
  const sortedA = [...actual].sort();
  const sortedB = [...expected].sort();
  if (JSON.stringify(sortedA) !== JSON.stringify(sortedB)) {
    throw new Error(`${label}: expected ${JSON.stringify(sortedB)}, got ${JSON.stringify(sortedA)}`);
  }
}

/** Assert a function throws */
export function assertThrows(fn: () => void, messageIncludes?: string): Error {
  try {
    fn();
  } catch (e: any) {
    if (messageIncludes && !e.message?.includes(messageIncludes)) {
      throw new Error(`Expected error containing "${messageIncludes}", got "${e.message}"`);
    }
    return e;
  }
  throw new Error("Expected function to throw");
}

/** Assert an async function throws */
export async function assertRejects(fn: () => Promise<unknown>, messageIncludes?: string): Promise<Error> {
  try {
    await fn();
  } catch (e: any) {
    if (messageIncludes && !e.message?.includes(messageIncludes)) {
      throw new Error(`Expected error containing "${messageIncludes}", got "${e.message}"`);
    }
    return e;
  }
  throw new Error("Expected promise to reject");
}

// ─── Timer Control ───────────────────────────────────────────────────────────

/** Replace setTimeout/setInterval with controllable versions */
export function useFakeTimers() {
  const origSetTimeout = globalThis.setTimeout;
  const origClearTimeout = globalThis.clearTimeout;
  const pending: Array<{ id: number; fn: () => void; delay: number; at: number }> = [];
  let now = 0;
  let nextId = 1;

  (globalThis as any).setTimeout = (fn: () => void, delay = 0) => {
    const id = nextId++;
    pending.push({ id, fn, delay, at: now + delay });
    return id;
  };
  (globalThis as any).clearTimeout = (id: number) => {
    const idx = pending.findIndex((p) => p.id === id);
    if (idx >= 0) pending.splice(idx, 1);
  };

  return {
    advance(ms: number) {
      now += ms;
      const due = pending.filter((p) => p.at <= now).sort((a, b) => a.at - b.at);
      due.forEach((p) => {
        const idx = pending.indexOf(p);
        if (idx >= 0) pending.splice(idx, 1);
        p.fn();
      });
    },
    restore() {
      globalThis.setTimeout = origSetTimeout;
      globalThis.clearTimeout = origClearTimeout;
    },
    get now() { return now; },
    get pendingCount() { return pending.length; },
  };
}
