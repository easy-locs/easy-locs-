/**
 * Card E2E Tests — Validate cardDispatch commands and store pipeline.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCardStore } from "@/domains/cards/card.store";
import { cardDispatch } from "@/domains/cards/card-dispatch";

// Mock platformBus
const emitSpy = vi.fn();
vi.mock("@/lib/shared/platform-bus", () => ({
  platformBus: { emit: (...args: any[]) => emitSpy(...args) },
}));

beforeEach(() => {
  useCardStore.getState().clear();
  emitSpy.mockClear();
});

describe("CardDispatch — load_entity", () => {
  it("returns error for unknown entity type", async () => {
    // cardBuildPipeline will fail for unknown types
    const result = await cardDispatch({
      type: "load_entity",
      entityId: "test-001",
      entityType: "unknown_type",
    });
    expect(result.ok).toBe(false);
  });
});

describe("CardDispatch — clear_cache", () => {
  it("clears all cached cards and entities", async () => {
    // Pre-populate store
    useCardStore.getState().setEntity("e1", { id: "e1" });
    useCardStore.getState().setCard("e1", {
      id: "e1",
      entityType: "storefront",
      title: "Test",
      subtitle: null,
      imageUrl: null,
      badges: [],
      rating: null,
      reviewCount: 0,
      priceLabel: null,
      distanceLabel: null,
      etaLabel: null,
      status: null,
      category: null,
    });
    expect(Object.keys(useCardStore.getState().entities)).toHaveLength(1);

    const result = await cardDispatch({ type: "clear_cache" });
    expect(result.ok).toBe(true);
    expect(Object.keys(useCardStore.getState().entities)).toHaveLength(0);
    expect(Object.keys(useCardStore.getState().cards)).toHaveLength(0);
  });
});

describe("CardDispatch — refresh_entity", () => {
  it("invalidates existing entity before rebuild", async () => {
    useCardStore.getState().setEntity("e2", { id: "e2" });
    useCardStore.getState().setCard("e2", {
      id: "e2",
      entityType: "storefront",
      title: "Old",
      subtitle: null,
      imageUrl: null,
      badges: [],
      rating: null,
      reviewCount: 0,
      priceLabel: null,
      distanceLabel: null,
      etaLabel: null,
      status: null,
      category: null,
    });

    // After invalidate, entity should be removed from cache
    const result = await cardDispatch({ type: "refresh_entity", entityId: "e2" });
    // Will fail at DB lookup (no real DB) but that's expected
    // The key test: invalidation happened
    expect(useCardStore.getState().entities["e2"]).toBeUndefined();
    expect(useCardStore.getState().cards["e2"]).toBeUndefined();
  });
});

describe("CardDispatch — contact_entity", () => {
  it("emits contact event via platformBus", async () => {
    const result = await cardDispatch({
      type: "contact_entity",
      entityId: "ent-001",
      entityType: "storefront",
      channel: "chat",
    });
    expect(result.ok).toBe(true);
    expect(emitSpy).toHaveBeenCalledWith(
      "card:contact",
      expect.objectContaining({ entityId: "ent-001", channel: "chat" }),
      "cardDispatch",
    );
  });
});

describe("CardDispatch — navigate_entity", () => {
  it("emits navigation event", async () => {
    const result = await cardDispatch({
      type: "navigate_entity",
      entityId: "ent-002",
      entityType: "listing",
    });
    expect(result.ok).toBe(true);
    expect(emitSpy).toHaveBeenCalledWith(
      "card:navigate",
      expect.objectContaining({ entityId: "ent-002" }),
      "cardDispatch",
    );
  });
});

describe("CardDispatch — save_entity", () => {
  it("emits save event", async () => {
    const result = await cardDispatch({
      type: "save_entity",
      entityId: "ent-003",
      entityType: "activity",
    });
    expect(result.ok).toBe(true);
    expect(emitSpy).toHaveBeenCalledWith(
      "card:save",
      expect.objectContaining({ entityId: "ent-003" }),
      "cardDispatch",
    );
  });
});

describe("CardDispatch — share_entity", () => {
  it("emits share event", async () => {
    const result = await cardDispatch({
      type: "share_entity",
      entityId: "ent-004",
      entityType: "storefront",
    });
    expect(result.ok).toBe(true);
    expect(emitSpy).toHaveBeenCalledWith(
      "card:share",
      expect.objectContaining({ entityId: "ent-004" }),
      "cardDispatch",
    );
  });
});

describe("CardStore — direct operations", () => {
  it("setEntity + setCard stores correctly", () => {
    useCardStore.getState().setEntity("x", { id: "x", name: "test" });
    expect(useCardStore.getState().entities["x"]).toEqual({ id: "x", name: "test" });
  });

  it("invalidate removes entity and card", () => {
    useCardStore.getState().setEntity("y", { id: "y" });
    useCardStore.getState().setCard("y", { id: "y" } as any);
    useCardStore.getState().invalidate("y");
    expect(useCardStore.getState().entities["y"]).toBeUndefined();
    expect(useCardStore.getState().cards["y"]).toBeUndefined();
  });

  it("setBatch stores multiple entries", () => {
    useCardStore.getState().setBatch([
      { id: "a", entity: { id: "a" }, card: { id: "a" } as any },
      { id: "b", entity: { id: "b" }, card: { id: "b" } as any },
    ]);
    expect(Object.keys(useCardStore.getState().entities)).toHaveLength(2);
    expect(Object.keys(useCardStore.getState().cards)).toHaveLength(2);
  });
});
