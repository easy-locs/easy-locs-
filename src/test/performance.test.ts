import { describe, it, expect } from "vitest";
import { debounce, throttle, imageSrcSet } from "@/lib/performance";

describe("Performance utilities", () => {
  describe("debounce", () => {
    it("delays execution", async () => {
      let count = 0;
      const fn = debounce(() => { count++; }, 50);
      fn();
      fn();
      fn();
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
      fn();
      fn();
      fn();
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
      const result = imageSrcSet("https://example.com/image.jpg");
      expect(result).toBe("");
    });
  });
});
