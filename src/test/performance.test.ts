import { describe, it, expect } from "vitest";
import {
  debounce,
  throttle,
  imageSrcSet,
  measurePerf,
  scheduleIdle,
  isSlowConnection,
  createLRUCache,
} from "@/lib/performance";

describe("Performance utilities", () => {
  describe("debounce", () => {
    it("delays execution", async () => {
      let count = 0;
      const fn = debounce(() => { count++; }, 50);
      fn(); fn(); fn();
      expect(count).toBe(0);
      await new Promise(r => setTimeout(r, 80));
      expect(count).toBe(1);
    });
  });

  describe("throttle", () => {
    it("executes immediately on first call", () => {
      let count = 0;
      const fn = throttle(() => { count++; }, 100);
      fn();
      expect(count).toBe(1);
    });

    it("blocks subsequent calls within interval", () => {
      let count = 0;
      const fn = throttle(() => { count++; }, 100);
      fn(); fn(); fn();
      expect(count).toBe(1);
    });
  });

  describe("imageSrcSet", () => {
    it("returns srcSet for supabase storage URLs", () => {
      const url = "https://example.supabase.co/storage/v1/object/public/photos/test.jpg";
      const result = imageSrcSet(url);
      expect(result).toContain("320w");
      expect(result).toContain("1280w");
    });

    it("returns empty for non-supabase URLs", () => {
      expect(imageSrcSet("https://example.com/image.jpg")).toBe("");
    });
  });

  describe("measurePerf", () => {
    it("returns function result", () => {
      expect(measurePerf("test", () => 42)).toBe(42);
    });
  });

  describe("scheduleIdle", () => {
    it("calls function eventually", async () => {
      let called = false;
      scheduleIdle(() => { called = true; }, 100);
      await new Promise(r => setTimeout(r, 200));
      expect(called).toBe(true);
    });
  });

  describe("isSlowConnection", () => {
    it("returns false without navigator.connection", () => {
      expect(isSlowConnection()).toBe(false);
    });
  });

  describe("createLRUCache", () => {
    it("stores and retrieves values", () => {
      const cache = createLRUCache<string, number>(3);
      cache.set("a", 1);
      cache.set("b", 2);
      expect(cache.get("a")).toBe(1);
      expect(cache.size).toBe(2);
    });

    it("evicts oldest entry when full", () => {
      const cache = createLRUCache<string, number>(2);
      cache.set("a", 1);
      cache.set("b", 2);
      cache.set("c", 3);
      expect(cache.has("a")).toBe(false);
      expect(cache.get("c")).toBe(3);
    });

    it("moves accessed items to end (LRU)", () => {
      const cache = createLRUCache<string, number>(2);
      cache.set("a", 1);
      cache.set("b", 2);
      cache.get("a");
      cache.set("c", 3);
      expect(cache.has("a")).toBe(true);
      expect(cache.has("b")).toBe(false);
    });

    it("clears all entries", () => {
      const cache = createLRUCache<string, number>(5);
      cache.set("x", 1);
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });
});
