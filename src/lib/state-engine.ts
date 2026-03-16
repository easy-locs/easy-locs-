/**
 * State Management Engine — PASS55 Block AN
 * 
 * Advanced patterns for Zustand-based state management:
 * 1. Selective subscriptions (re-render only on slice changes)
 * 2. Computed selectors with memoization
 * 3. State middleware (logging, validation, undo)
 * 4. Optimistic update pattern with rollback
 * 5. State persistence helpers
 * 6. Batch state updates
 */

/* ═══════════════════════════════════════════════════
   1. SELECTIVE SUBSCRIPTIONS — Shallow equality helpers
   ═══════════════════════════════════════════════════ */

/**
 * Shallow equality comparator for Zustand selectors.
 * Prevents re-renders when selected slice hasn't actually changed.
 * 
 * @example
 * const { name, email } = useStore(
 *   (s) => ({ name: s.name, email: s.email }),
 *   shallowEqual
 * );
 */
export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.is((a as any)[key], (b as any)[key])) return false;
  }
  return true;
}

/**
 * Create a memoized selector that only recomputes when inputs change.
 * Uses shallow comparison on the input slice.
 * 
 * @example
 * const selectActiveLeases = createSelector(
 *   (s: State) => s.leases,
 *   (leases) => leases.filter(l => l.status === "active")
 * );
 * const active = useStore(selectActiveLeases);
 */
export function createSelector<TState, TSlice, TResult>(
  sliceSelector: (state: TState) => TSlice,
  compute: (slice: TSlice) => TResult
): (state: TState) => TResult {
  let cachedSlice: TSlice | undefined;
  let cachedResult: TResult | undefined;

  return (state: TState): TResult => {
    const slice = sliceSelector(state);

    if (cachedSlice !== undefined && shallowEqual(slice, cachedSlice)) {
      return cachedResult as TResult;
    }

    cachedSlice = slice;
    cachedResult = compute(slice);
    return cachedResult;
  };
}

/**
 * Create a multi-input selector (like Reselect's createSelector).
 * 
 * @example
 * const selectFilteredTenants = createDerivedSelector(
 *   [(s) => s.tenants, (s) => s.searchQuery],
 *   (tenants, query) => tenants.filter(t => t.name.includes(query))
 * );
 */
export function createDerivedSelector<TState, TInputs extends readonly unknown[], TResult>(
  inputSelectors: { [K in keyof TInputs]: (state: TState) => TInputs[K] },
  combiner: (...inputs: TInputs) => TResult
): (state: TState) => TResult {
  let cachedInputs: TInputs | undefined;
  let cachedResult: TResult | undefined;

  return (state: TState): TResult => {
    const inputs = inputSelectors.map((sel) => sel(state)) as unknown as TInputs;

    if (cachedInputs !== undefined) {
      let allSame = true;
      for (let i = 0; i < inputs.length; i++) {
        if (!Object.is(inputs[i], cachedInputs[i])) {
          allSame = false;
          break;
        }
      }
      if (allSame) return cachedResult as TResult;
    }

    cachedInputs = inputs;
    cachedResult = combiner(...inputs);
    return cachedResult;
  };
}

/* ═══════════════════════════════════════════════════
   2. OPTIMISTIC UPDATES WITH ROLLBACK
   ═══════════════════════════════════════════════════ */

export interface OptimisticOperation<T> {
  id: string;
  previousState: T;
  timestamp: number;
  description: string;
}

const pendingOps = new Map<string, OptimisticOperation<unknown>>();

/**
 * Execute an optimistic update with automatic rollback on failure.
 * 
 * @example
 * await optimisticUpdate({
 *   id: `delete-tenant-${tenantId}`,
 *   description: "Delete tenant",
 *   getState: () => useStore.getState().tenants,
 *   setState: (tenants) => useStore.setState({ tenants }),
 *   optimisticState: tenants.filter(t => t.id !== tenantId),
 *   asyncAction: () => supabase.from("tenants").delete().eq("id", tenantId),
 * });
 */
export async function optimisticUpdate<T>(opts: {
  id: string;
  description: string;
  getState: () => T;
  setState: (state: T) => void;
  optimisticState: T;
  asyncAction: () => Promise<{ error?: unknown }>;
  onRollback?: (previous: T, error: unknown) => void;
  onSuccess?: () => void;
}): Promise<{ success: boolean; error?: unknown }> {
  const previous = opts.getState();

  // Store rollback info
  const op: OptimisticOperation<T> = {
    id: opts.id,
    previousState: previous,
    timestamp: Date.now(),
    description: opts.description,
  };
  pendingOps.set(opts.id, op as OptimisticOperation<unknown>);

  // Apply optimistic state immediately
  opts.setState(opts.optimisticState);

  try {
    const result = await opts.asyncAction();

    if (result.error) {
      // Rollback
      opts.setState(previous);
      opts.onRollback?.(previous, result.error);
      return { success: false, error: result.error };
    }

    opts.onSuccess?.();
    return { success: true };
  } catch (error) {
    // Rollback on exception
    opts.setState(previous);
    opts.onRollback?.(previous, error);
    return { success: false, error };
  } finally {
    pendingOps.delete(opts.id);
  }
}

/** Check if an optimistic operation is pending */
export function isOptimisticPending(id: string): boolean {
  return pendingOps.has(id);
}

/** Get count of pending optimistic operations */
export function getPendingOpsCount(): number {
  return pendingOps.size;
}

/* ═══════════════════════════════════════════════════
   3. STATE HISTORY (UNDO/REDO)
   ═══════════════════════════════════════════════════ */

export interface StateHistory<T> {
  past: T[];
  present: T;
  future: T[];
}

/** Create a state history tracker */
export function createStateHistory<T>(initialState: T, maxHistory = 30): {
  getHistory: () => StateHistory<T>;
  push: (state: T) => void;
  undo: () => T | null;
  redo: () => T | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
} {
  const history: StateHistory<T> = {
    past: [],
    present: initialState,
    future: [],
  };

  return {
    getHistory: () => ({ ...history }),

    push: (state: T) => {
      history.past.push(history.present);
      if (history.past.length > maxHistory) {
        history.past.shift();
      }
      history.present = state;
      history.future = []; // Clear redo stack on new action
    },

    undo: () => {
      if (history.past.length === 0) return null;
      history.future.push(history.present);
      history.present = history.past.pop()!;
      return history.present;
    },

    redo: () => {
      if (history.future.length === 0) return null;
      history.past.push(history.present);
      history.present = history.future.pop()!;
      return history.present;
    },

    canUndo: () => history.past.length > 0,
    canRedo: () => history.future.length > 0,

    clear: () => {
      history.past = [];
      history.future = [];
    },
  };
}

/* ═══════════════════════════════════════════════════
   4. BATCH STATE UPDATES
   ═══════════════════════════════════════════════════ */

/**
 * Batch multiple state updates into a single render cycle.
 * Uses microtask scheduling to coalesce rapid updates.
 * 
 * @example
 * const batcher = createStateBatcher<AppState>(useStore.setState);
 * batcher.queue({ loading: true });
 * batcher.queue({ data: fetchedData });
 * batcher.queue({ loading: false });
 * // → Single setState call with merged updates
 */
export function createStateBatcher<T extends Record<string, unknown>>(
  setState: (partial: Partial<T>) => void,
  debounceMs = 0
): {
  queue: (update: Partial<T>) => void;
  flush: () => void;
} {
  let pending: Partial<T> = {};
  let timer: ReturnType<typeof setTimeout> | null = null;

  function flush() {
    if (Object.keys(pending).length > 0) {
      setState({ ...pending });
      pending = {};
    }
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  return {
    queue: (update: Partial<T>) => {
      Object.assign(pending, update);
      if (timer) clearTimeout(timer);

      if (debounceMs <= 0) {
        // Use microtask for zero-delay batching
        timer = setTimeout(flush, 0);
      } else {
        timer = setTimeout(flush, debounceMs);
      }
    },
    flush,
  };
}

/* ═══════════════════════════════════════════════════
   5. STATE PERSISTENCE HELPERS
   ═══════════════════════════════════════════════════ */

/** 
 * Safe localStorage read with JSON parsing and fallback.
 * Returns the fallback on any error (parse failure, quota, SSR).
 */
export function readPersistedState<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Safe localStorage write with JSON serialization */
export function writePersistedState<T>(key: string, state: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Remove persisted state */
export function clearPersistedState(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Create a debounced persister — writes state to localStorage
 * after a configurable delay to avoid excessive writes.
 */
export function createDebouncedPersister<T>(
  key: string,
  debounceMs = 1000
): {
  persist: (state: T) => void;
  flush: () => void;
  clear: () => void;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let latest: T | null = null;

  function doWrite() {
    if (latest !== null) {
      writePersistedState(key, latest);
      latest = null;
    }
  }

  return {
    persist: (state: T) => {
      latest = state;
      if (timer) clearTimeout(timer);
      timer = setTimeout(doWrite, debounceMs);
    },
    flush: () => {
      if (timer) clearTimeout(timer);
      doWrite();
    },
    clear: () => {
      if (timer) clearTimeout(timer);
      latest = null;
      clearPersistedState(key);
    },
  };
}

/* ═══════════════════════════════════════════════════
   6. STATE MIDDLEWARE PATTERNS
   ═══════════════════════════════════════════════════ */

/**
 * Create a logging middleware wrapper for state changes.
 * Logs previous and next state diffs.
 */
export function createStateLogger<T extends Record<string, unknown>>(
  storeName: string,
  enabled = true
): (prev: Partial<T>, next: Partial<T>) => void {
  return (prev: Partial<T>, next: Partial<T>) => {
    if (!enabled) return;

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(next)) {
      if (!Object.is((prev as any)[key], (next as any)[key])) {
        changes[key] = { from: (prev as any)[key], to: (next as any)[key] };
      }
    }

    if (Object.keys(changes).length > 0) {
      console.groupCollapsed(`[${storeName}] State change`);
      console.table(changes);
      console.groupEnd();
    }
  };
}

/**
 * Create a state validator that checks invariants after each update.
 * Returns a list of violated invariants.
 */
export function createStateValidator<T>(
  rules: Array<{ name: string; check: (state: T) => boolean }>
): (state: T) => string[] {
  return (state: T) => {
    const violations: string[] = [];
    for (const rule of rules) {
      if (!rule.check(state)) {
        violations.push(rule.name);
      }
    }
    return violations;
  };
}

/* ═══════════════════════════════════════════════════
   7. ENTITY ADAPTER — Normalized state management
   ═══════════════════════════════════════════════════ */

export interface EntityState<T extends { id: string }> {
  ids: string[];
  entities: Record<string, T>;
}

/** Create a normalized entity adapter for managing collections */
export function createEntityAdapter<T extends { id: string }>() {
  const getInitialState = (): EntityState<T> => ({
    ids: [],
    entities: {},
  });

  const setAll = (items: T[]): EntityState<T> => ({
    ids: items.map((i) => i.id),
    entities: Object.fromEntries(items.map((i) => [i.id, i])),
  });

  const addOne = (state: EntityState<T>, item: T): EntityState<T> => {
    if (state.entities[item.id]) return updateOne(state, item);
    return {
      ids: [...state.ids, item.id],
      entities: { ...state.entities, [item.id]: item },
    };
  };

  const updateOne = (state: EntityState<T>, item: Partial<T> & { id: string }): EntityState<T> => {
    const existing = state.entities[item.id];
    if (!existing) return state;
    return {
      ids: state.ids,
      entities: { ...state.entities, [item.id]: { ...existing, ...item } },
    };
  };

  const removeOne = (state: EntityState<T>, id: string): EntityState<T> => {
    if (!state.entities[id]) return state;
    const { [id]: _, ...rest } = state.entities;
    return {
      ids: state.ids.filter((i) => i !== id),
      entities: rest,
    };
  };

  const selectAll = (state: EntityState<T>): T[] =>
    state.ids.map((id) => state.entities[id]).filter(Boolean);

  const selectById = (state: EntityState<T>, id: string): T | undefined =>
    state.entities[id];

  const selectTotal = (state: EntityState<T>): number => state.ids.length;

  return {
    getInitialState,
    setAll,
    addOne,
    updateOne,
    removeOne,
    selectAll,
    selectById,
    selectTotal,
  };
}
