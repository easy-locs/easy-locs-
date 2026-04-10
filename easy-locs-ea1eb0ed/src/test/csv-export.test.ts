import { describe, it, expect, vi, beforeEach } from "vitest";

describe("CSV Export", () => {
  beforeEach(() => {
    // Mock DOM APIs
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:test"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("exports data with custom columns", async () => {
    const { exportToCSV } = await import("@/lib/csv-export");

    const clickSpy = vi.fn();
    vi.spyOn(document, "createElement").mockReturnValue({
      set href(v: string) {},
      set download(v: string) {},
      click: clickSpy,
    } as any);

    const data = [
      { name: "Alice", age: 30, city: "Paris" },
      { name: "Bob", age: 25, city: "Lyon" },
    ];

    exportToCSV(data, "test", [
      { key: "name", label: "Name" },
      { key: "city", label: "City" },
    ]);

    expect(clickSpy).toHaveBeenCalled();
  });

  it("does nothing with empty data", async () => {
    const { exportToCSV } = await import("@/lib/csv-export");
    const spy = vi.spyOn(document, "createElement");
    exportToCSV([], "empty");
    expect(spy).not.toHaveBeenCalled();
  });
});
