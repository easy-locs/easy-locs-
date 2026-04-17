/**
 * JsonDiffView unit tests (#812).
 * Covers: empty diff, scalar change, key add/remove, nested structures,
 * type-mismatch handling, and arrays with positional diff.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import JsonDiffView, { diffJson } from "../JsonDiffView";

describe("diffJson", () => {
  it("returns single unchanged entry for identical primitives", () => {
    const out = diffJson(1, 1);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("unchanged");
  });

  it("flags scalar changes", () => {
    const out = diffJson({ price: 100 }, { price: 120 });
    expect(out.find((e) => e.path === "$.price")?.kind).toBe("changed");
  });

  it("flags added and removed keys", () => {
    const out = diffJson({ a: 1 }, { b: 2 });
    const a = out.find((e) => e.path === "$.a");
    const b = out.find((e) => e.path === "$.b");
    expect(a?.kind).toBe("removed");
    expect(b?.kind).toBe("added");
  });

  it("walks nested objects", () => {
    const before = { meta: { v: 1 }, name: "x" };
    const after = { meta: { v: 2 }, name: "x" };
    const out = diffJson(before, after);
    expect(out.find((e) => e.path === "$.meta.v")?.kind).toBe("changed");
    expect(out.find((e) => e.path === "$.name")?.kind).toBe("unchanged");
  });

  it("diffs arrays positionally", () => {
    const out = diffJson([1, 2, 3], [1, 9, 3, 4]);
    expect(out.find((e) => e.path === "$[1]")?.kind).toBe("changed");
    expect(out.find((e) => e.path === "$[3]")?.kind).toBe("added");
  });

  it("treats type mismatch as a change", () => {
    const out = diffJson({ x: 1 }, { x: "1" });
    expect(out.find((e) => e.path === "$.x")?.kind).toBe("changed");
  });
});

describe("<JsonDiffView />", () => {
  it("renders empty state when nothing changed", () => {
    render(<JsonDiffView before={{ a: 1 }} after={{ a: 1 }} />);
    expect(screen.getByTestId("json-diff-empty")).toBeInTheDocument();
  });

  it("hides unchanged rows by default", () => {
    render(
      <JsonDiffView
        before={{ a: 1, b: 2 }}
        after={{ a: 1, b: 99 }}
      />,
    );
    const rows = screen.getAllByTestId("json-diff-row");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveAttribute("data-kind", "changed");
  });

  it("shows unchanged rows when requested", () => {
    render(
      <JsonDiffView
        before={{ a: 1, b: 2 }}
        after={{ a: 1, b: 99 }}
        showUnchanged
      />,
    );
    const rows = screen.getAllByTestId("json-diff-row");
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });
});
