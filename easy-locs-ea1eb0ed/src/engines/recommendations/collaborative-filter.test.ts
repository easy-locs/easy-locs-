import { describe, it, expect, beforeEach, vi } from "vitest";

describe("collaborative-filter – buildUserProfile sanitization", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("replaces NaN and ±Infinity in interactionVector with 0", async () => {
    vi.doMock("./vector-similarity", async () => {
      const actual = await vi.importActual<typeof import("./vector-similarity")>("./vector-similarity");
      return {
        ...actual,
        normalizeVector: () => [NaN, 0.5, Infinity, -Infinity, 0.3],
      };
    });

    const { recordInteraction, buildUserProfile } = await import("./collaborative-filter");

    recordInteraction({ userId: "u1", itemId: "item1", type: "click", timestamp: Date.now() });

    const embeddings = new Map<string, number[]>();
    embeddings.set("item1", [1, 0, 0, 0, 0]);

    const profile = buildUserProfile("u1", embeddings);

    expect(profile.interactionVector).toHaveLength(5);
    expect(profile.interactionVector).toEqual([0, 0.5, 0, 0, 0.3]);
    for (const val of profile.interactionVector) {
      expect(Number.isFinite(val)).toBe(true);
    }
  });

  it("handles embeddings containing NaN values without producing non-finite vector entries", async () => {
    const { recordInteraction, buildUserProfile } = await import("./collaborative-filter");

    recordInteraction({ userId: "u3", itemId: "nanItem", type: "purchase", timestamp: Date.now() });

    const embeddings = new Map<string, number[]>();
    embeddings.set("nanItem", [NaN, 1, NaN]);

    const profile = buildUserProfile("u3", embeddings);

    expect(profile.interactionVector).toHaveLength(3);
    for (const val of profile.interactionVector) {
      expect(Number.isFinite(val)).toBe(true);
    }
  });

  it("returns empty array when no embeddings match", async () => {
    const { recordInteraction, buildUserProfile } = await import("./collaborative-filter");

    recordInteraction({ userId: "u2", itemId: "missing", type: "view", timestamp: Date.now() });

    const embeddings = new Map<string, number[]>();
    const profile = buildUserProfile("u2", embeddings);

    expect(profile.interactionVector).toEqual([]);
  });
});

describe("collaborative-filter – getCollaborativeSignals sanitization", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.doUnmock("./vector-similarity");
  });

  it("produces finite scores for normal collaborative signals", async () => {
    const { recordInteraction, buildUserProfile, getCollaborativeSignals } = await import("./collaborative-filter");

    const embeddings = new Map<string, number[]>();
    embeddings.set("shared", [1, 0, 0]);
    embeddings.set("unique", [0.9, 0.1, 0]);

    recordInteraction({ userId: "userA", itemId: "shared", type: "purchase", timestamp: Date.now() });
    buildUserProfile("userA", embeddings);

    recordInteraction({ userId: "userB", itemId: "shared", type: "purchase", timestamp: Date.now() });
    recordInteraction({ userId: "userB", itemId: "unique", type: "click", timestamp: Date.now() });
    buildUserProfile("userB", embeddings);

    const signals = getCollaborativeSignals("userA", embeddings);

    expect(signals.size).toBeGreaterThan(0);
    expect(signals.has("unique")).toBe(true);
    for (const [, score] of signals) {
      expect(Number.isFinite(score)).toBe(true);
      expect(score).toBeGreaterThan(0);
    }
  });

  it("sanitizes Infinity scores to 0 when cosineSimilarity returns Infinity", async () => {
    vi.doMock("./vector-similarity", async () => {
      const actual = await vi.importActual<typeof import("./vector-similarity")>("./vector-similarity");
      return {
        ...actual,
        cosineSimilarity: () => Infinity,
      };
    });

    const { recordInteraction, buildUserProfile, getCollaborativeSignals } = await import("./collaborative-filter");

    const embeddings = new Map<string, number[]>();
    embeddings.set("s1", [1, 0]);
    embeddings.set("s2", [0, 1]);

    recordInteraction({ userId: "p1", itemId: "s1", type: "favorite", timestamp: Date.now() });
    buildUserProfile("p1", embeddings);

    recordInteraction({ userId: "p2", itemId: "s1", type: "favorite", timestamp: Date.now() });
    recordInteraction({ userId: "p2", itemId: "s2", type: "view", timestamp: Date.now() });
    buildUserProfile("p2", embeddings);

    const signals = getCollaborativeSignals("p1", embeddings);

    expect(signals.size).toBeGreaterThan(0);
    expect(signals.has("s2")).toBe(true);
    expect(signals.get("s2")).toBe(0);
    for (const [, score] of signals) {
      expect(Number.isFinite(score)).toBe(true);
    }
  });

  it("returns empty map when no similar users exist (NaN similarity filtered out)", async () => {
    vi.doMock("./vector-similarity", async () => {
      const actual = await vi.importActual<typeof import("./vector-similarity")>("./vector-similarity");
      return {
        ...actual,
        cosineSimilarity: () => NaN,
      };
    });

    const { recordInteraction, buildUserProfile, getCollaborativeSignals } = await import("./collaborative-filter");

    const embeddings = new Map<string, number[]>();
    embeddings.set("x1", [1, 0]);
    embeddings.set("x2", [0, 1]);

    recordInteraction({ userId: "q1", itemId: "x1", type: "purchase", timestamp: Date.now() });
    buildUserProfile("q1", embeddings);

    recordInteraction({ userId: "q2", itemId: "x1", type: "purchase", timestamp: Date.now() });
    recordInteraction({ userId: "q2", itemId: "x2", type: "click", timestamp: Date.now() });
    buildUserProfile("q2", embeddings);

    const signals = getCollaborativeSignals("q1", embeddings);

    expect(signals.size).toBe(0);
  });

  it("sanitizes NaN scores produced by accumulated non-finite additions", async () => {
    let callCount = 0;
    vi.doMock("./vector-similarity", async () => {
      const actual = await vi.importActual<typeof import("./vector-similarity")>("./vector-similarity");
      return {
        ...actual,
        cosineSimilarity: () => {
          callCount++;
          if (callCount <= 2) return 0.9;
          return Infinity;
        },
      };
    });

    const { recordInteraction, buildUserProfile, getCollaborativeSignals } = await import("./collaborative-filter");

    const embeddings = new Map<string, number[]>();
    embeddings.set("c1", [1, 0]);
    embeddings.set("c2", [0, 1]);
    embeddings.set("c3", [0.5, 0.5]);

    recordInteraction({ userId: "r1", itemId: "c1", type: "purchase", timestamp: Date.now() });
    buildUserProfile("r1", embeddings);

    recordInteraction({ userId: "r2", itemId: "c1", type: "purchase", timestamp: Date.now() });
    recordInteraction({ userId: "r2", itemId: "c2", type: "click", timestamp: Date.now() });
    buildUserProfile("r2", embeddings);

    recordInteraction({ userId: "r3", itemId: "c1", type: "purchase", timestamp: Date.now() });
    recordInteraction({ userId: "r3", itemId: "c3", type: "review", timestamp: Date.now() });
    buildUserProfile("r3", embeddings);

    const signals = getCollaborativeSignals("r1", embeddings);

    for (const [, score] of signals) {
      expect(Number.isFinite(score)).toBe(true);
    }
  });
});
