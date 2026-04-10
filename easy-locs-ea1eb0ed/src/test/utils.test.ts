import { describe, it, expect } from "vitest";

describe("Utils - cn()", () => {
  it("merges class names", async () => {
    const { cn } = await import("@/lib/utils");
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("deduplicates conflicting tailwind classes", async () => {
    const { cn } = await import("@/lib/utils");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles undefined/null gracefully", async () => {
    const { cn } = await import("@/lib/utils");
    expect(cn("px-4", undefined, null as any, "py-2")).toBe("px-4 py-2");
  });

  it("handles empty string", async () => {
    const { cn } = await import("@/lib/utils");
    expect(cn("", "px-4")).toBe("px-4");
  });
});
