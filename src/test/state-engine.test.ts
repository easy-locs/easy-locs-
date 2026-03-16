import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  shallowEqual,
  createSelector,
  createDerivedSelector,
  optimisticUpdate,
  isOptimisticPending,
  createStateHistory,
  createStateBatcher,
  readPersistedState,
  writePersistedState,
  clearPersistedState,
  createStateLogger,
  createStateValidator,
  createEntityAdapter,
} from "@/lib/state-engine";

/* ═══════════════════════════════════════════════════
   SHALLOW EQUAL
   ═══════════════════════════════════════════════════ */
describe("shallowEqual", () => {
  it("identical refs are equal", () => {
    const obj = { a: 1 };
    expect(shallowEqual(obj, obj)).toBe(true);
  });
  it("same values are equal", () => {
    expect(shallowEqual({ a: 1, b: "x" }, { a: 1, b: "x" })).toBe(true);
  });
  it("different values are not equal", () => {
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
  });
  it("different key count not equal", () => {
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 } as any)).toBe(false);
  });
  it("primitives", () => {
    expect(shallowEqual(1, 1)).toBe(true);
    expect(shallowEqual("a", "b")).toBe(false);
  });
  it("null handling", () => {
    expect(shallowEqual(null, null)).toBe(true);
    expect(shallowEqual(null, { a: 1 })).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════
   SELECTORS
   ═══════════════════════════════════════════════════ */
describe("createSelector", () => {
  it("computes derived state", () => {
    const selector = createSelector(
      (s: { items: number[] }) => s.items,
      (items) => items.filter((i) => i > 2)
    );
    expect(selector({ items: [1, 2, 3, 4] })).toEqual([3, 4]);
  });
  it("memoizes when slice unchanged", () => {
    const compute = vi.fn((items: number[]) => items.length);
    const selector = createSelector((s: { items: number[] }) => s.items, compute);
    const items = [1, 2, 3];
    selector({ items });
    selector({ items }); // same ref
    expect(compute).toHaveBeenCalledTimes(1);
  });
});

describe("createDerivedSelector", () => {
  it("combines multiple inputs", () => {
    type AB = { a: number; b: number };
    const selector = createDerivedSelector<AB, [number, number], number>(
      [(s) => s.a, (s) => s.b],
      (a, b) => a + b
    );
    expect(selector({ a: 3, b: 7 })).toBe(10);
  });
  it("memoizes", () => {
    type XY = { x: number; y: number };
    const combine = vi.fn((a: number, b: number) => a * b);
    const selector = createDerivedSelector<XY, [number, number], number>(
      [(s) => s.x, (s) => s.y],
      combine
    );
    const state = { x: 2, y: 5 };
    selector(state);
    selector(state);
    expect(combine).toHaveBeenCalledTimes(1);
  });
});

/* ═══════════════════════════════════════════════════
   OPTIMISTIC UPDATES
   ═══════════════════════════════════════════════════ */
describe("optimisticUpdate", () => {
  it("applies optimistic state on success", async () => {
    let state = [1, 2, 3];
    const result = await optimisticUpdate({
      id: "test-op",
      description: "Remove item",
      getState: () => state,
      setState: (s) => { state = s; },
      optimisticState: [1, 3],
      asyncAction: async () => ({}),
    });
    expect(result.success).toBe(true);
    expect(state).toEqual([1, 3]);
  });

  it("rolls back on error", async () => {
    let state = [1, 2, 3];
    const result = await optimisticUpdate({
      id: "test-op-err",
      description: "Fail",
      getState: () => state,
      setState: (s) => { state = s; },
      optimisticState: [],
      asyncAction: async () => ({ error: "DB error" }),
    });
    expect(result.success).toBe(false);
    expect(state).toEqual([1, 2, 3]);
  });

  it("rolls back on exception", async () => {
    let state = "original";
    await optimisticUpdate({
      id: "test-throw",
      description: "Throw",
      getState: () => state,
      setState: (s) => { state = s; },
      optimisticState: "optimistic",
      asyncAction: async () => { throw new Error("Network"); },
    });
    expect(state).toBe("original");
  });
});

/* ═══════════════════════════════════════════════════
   STATE HISTORY
   ═══════════════════════════════════════════════════ */
describe("createStateHistory", () => {
  it("tracks undo/redo", () => {
    const h = createStateHistory("initial");
    h.push("second");
    h.push("third");

    expect(h.canUndo()).toBe(true);
    expect(h.undo()).toBe("second");
    expect(h.undo()).toBe("initial");
    expect(h.canUndo()).toBe(false);

    expect(h.canRedo()).toBe(true);
    expect(h.redo()).toBe("second");
  });

  it("clears redo on new push", () => {
    const h = createStateHistory(0);
    h.push(1);
    h.push(2);
    h.undo(); // back to 1
    h.push(3); // new branch
    expect(h.canRedo()).toBe(false);
  });

  it("respects max history", () => {
    const h = createStateHistory(0, 3);
    h.push(1);
    h.push(2);
    h.push(3);
    h.push(4); // oldest (0) should be dropped
    const hist = h.getHistory();
    expect(hist.past.length).toBe(3);
  });

  it("clear resets stacks", () => {
    const h = createStateHistory("a");
    h.push("b");
    h.clear();
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════
   STATE BATCHER
   ═══════════════════════════════════════════════════ */
describe("createStateBatcher", () => {
  it("batches updates on flush", () => {
    const setState = vi.fn();
    const batcher = createStateBatcher<{ a: number; b: string }>(setState);
    batcher.queue({ a: 1 });
    batcher.queue({ b: "x" });
    batcher.flush();
    expect(setState).toHaveBeenCalledWith({ a: 1, b: "x" });
  });

  it("does nothing on empty flush", () => {
    const setState = vi.fn();
    const batcher = createStateBatcher(setState);
    batcher.flush();
    expect(setState).not.toHaveBeenCalled();
  });
});

/* ═══════════════════════════════════════════════════
   PERSISTENCE HELPERS
   ═══════════════════════════════════════════════════ */
describe("persistence helpers", () => {
  beforeEach(() => localStorage.clear());

  it("writes and reads state", () => {
    writePersistedState("test-key", { x: 42 });
    expect(readPersistedState("test-key", {})).toEqual({ x: 42 });
  });

  it("returns fallback on missing key", () => {
    expect(readPersistedState("nope", "default")).toBe("default");
  });

  it("clears state", () => {
    writePersistedState("rm-key", "data");
    clearPersistedState("rm-key");
    expect(readPersistedState("rm-key", null)).toBeNull();
  });
});

/* ═══════════════════════════════════════════════════
   STATE VALIDATOR
   ═══════════════════════════════════════════════════ */
describe("createStateValidator", () => {
  it("returns empty array for valid state", () => {
    const validate = createStateValidator([
      { name: "positive", check: (s: { count: number }) => s.count >= 0 },
    ]);
    expect(validate({ count: 5 })).toEqual([]);
  });

  it("returns violation names", () => {
    const validate = createStateValidator([
      { name: "not_empty", check: (s: { items: unknown[] }) => s.items.length > 0 },
      { name: "max_100", check: (s: { items: unknown[] }) => s.items.length <= 100 },
    ]);
    expect(validate({ items: [] })).toEqual(["not_empty"]);
  });
});

/* ═══════════════════════════════════════════════════
   ENTITY ADAPTER
   ═══════════════════════════════════════════════════ */
describe("createEntityAdapter", () => {
  interface Item { id: string; name: string }
  const adapter = createEntityAdapter<Item>();

  it("initializes empty state", () => {
    const state = adapter.getInitialState();
    expect(state.ids).toEqual([]);
    expect(adapter.selectTotal(state)).toBe(0);
  });

  it("setAll populates state", () => {
    const state = adapter.setAll([
      { id: "1", name: "A" },
      { id: "2", name: "B" },
    ]);
    expect(state.ids).toEqual(["1", "2"]);
    expect(adapter.selectAll(state)).toHaveLength(2);
  });

  it("addOne appends", () => {
    let state = adapter.getInitialState();
    state = adapter.addOne(state, { id: "x", name: "X" });
    expect(adapter.selectById(state, "x")?.name).toBe("X");
    expect(adapter.selectTotal(state)).toBe(1);
  });

  it("addOne updates existing", () => {
    let state = adapter.setAll([{ id: "1", name: "old" }]);
    state = adapter.addOne(state, { id: "1", name: "new" });
    expect(adapter.selectById(state, "1")?.name).toBe("new");
    expect(adapter.selectTotal(state)).toBe(1);
  });

  it("updateOne merges", () => {
    let state = adapter.setAll([{ id: "1", name: "A" }]);
    state = adapter.updateOne(state, { id: "1", name: "B" });
    expect(adapter.selectById(state, "1")?.name).toBe("B");
  });

  it("removeOne deletes", () => {
    let state = adapter.setAll([{ id: "1", name: "A" }, { id: "2", name: "B" }]);
    state = adapter.removeOne(state, "1");
    expect(adapter.selectTotal(state)).toBe(1);
    expect(adapter.selectById(state, "1")).toBeUndefined();
  });

  it("removeOne is no-op for missing id", () => {
    const state = adapter.setAll([{ id: "1", name: "A" }]);
    const next = adapter.removeOne(state, "99");
    expect(next).toBe(state); // same reference
  });
});
