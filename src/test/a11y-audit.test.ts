/**
 * Accessibility Audit Tests — WCAG 2.1 AA
 */
import { describe, it, expect } from "vitest";
import {
  parseColor,
  hslToRgb,
  relativeLuminance,
  contrastRatio,
  meetsWCAG_AA,
  meetsWCAG_AAA,
  KEYS,
  createArrowKeyHandler,
  summarizeAudit,
  getFocusableElements,
  generateAriaId,
  type A11yIssue,
} from "@/lib/a11y-audit";

/* ── Color Parsing ── */
describe("parseColor", () => {
  it("parses 3-digit hex", () => {
    expect(parseColor("#fff")).toEqual([255, 255, 255]);
    expect(parseColor("#000")).toEqual([0, 0, 0]);
  });

  it("parses 6-digit hex", () => {
    expect(parseColor("#ff0000")).toEqual([255, 0, 0]);
    expect(parseColor("#00ff00")).toEqual([0, 255, 0]);
    expect(parseColor("#0000ff")).toEqual([0, 0, 255]);
  });

  it("parses rgb()", () => {
    expect(parseColor("rgb(128, 64, 32)")).toEqual([128, 64, 32]);
  });

  it("parses hsl()", () => {
    const result = parseColor("hsl(0, 100, 50)");
    expect(result).toEqual([255, 0, 0]);
  });

  it("returns null for invalid input", () => {
    expect(parseColor("not-a-color")).toBeNull();
    expect(parseColor("")).toBeNull();
  });
});

/* ── HSL to RGB ── */
describe("hslToRgb", () => {
  it("converts pure red", () => {
    expect(hslToRgb(0, 100, 50)).toEqual([255, 0, 0]);
  });

  it("converts pure green", () => {
    expect(hslToRgb(120, 100, 50)).toEqual([0, 255, 0]);
  });

  it("converts white", () => {
    expect(hslToRgb(0, 0, 100)).toEqual([255, 255, 255]);
  });

  it("converts black", () => {
    expect(hslToRgb(0, 0, 0)).toEqual([0, 0, 0]);
  });
});

/* ── Luminance ── */
describe("relativeLuminance", () => {
  it("white = 1.0", () => {
    expect(relativeLuminance(255, 255, 255)).toBeCloseTo(1.0, 2);
  });

  it("black = 0.0", () => {
    expect(relativeLuminance(0, 0, 0)).toBeCloseTo(0.0, 2);
  });

  it("mid-gray is between 0 and 1", () => {
    const lum = relativeLuminance(128, 128, 128);
    expect(lum).toBeGreaterThan(0);
    expect(lum).toBeLessThan(1);
  });
});

/* ── Contrast Ratio ── */
describe("contrastRatio", () => {
  it("black on white = 21:1", () => {
    const ratio = contrastRatio("#000000", "#ffffff");
    expect(ratio).toBeCloseTo(21, 0);
  });

  it("same color = 1:1", () => {
    expect(contrastRatio("#ff0000", "#ff0000")).toBeCloseTo(1, 1);
  });

  it("returns null for invalid colors", () => {
    expect(contrastRatio("invalid", "#fff")).toBeNull();
  });
});

/* ── WCAG Compliance ── */
describe("meetsWCAG_AA", () => {
  it("black on white passes for normal text", () => {
    expect(meetsWCAG_AA("#000", "#fff")).toBe(true);
  });

  it("light gray on white fails for normal text", () => {
    expect(meetsWCAG_AA("#999", "#fff")).toBe(false);
  });

  it("large text has lower threshold (3:1)", () => {
    // #767676 on white ≈ 4.54:1 — passes AA for large text
    expect(meetsWCAG_AA("#767676", "#fff", true)).toBe(true);
  });
});

describe("meetsWCAG_AAA", () => {
  it("black on white passes AAA", () => {
    expect(meetsWCAG_AAA("#000", "#fff")).toBe(true);
  });

  it("mid-gray on white fails AAA normal", () => {
    expect(meetsWCAG_AAA("#888", "#fff")).toBe(false);
  });
});

/* ── Keyboard Constants ── */
describe("KEYS", () => {
  it("contains standard ARIA keys", () => {
    expect(KEYS.ENTER).toBe("Enter");
    expect(KEYS.SPACE).toBe(" ");
    expect(KEYS.ESCAPE).toBe("Escape");
    expect(KEYS.TAB).toBe("Tab");
    expect(KEYS.ARROW_UP).toBe("ArrowUp");
    expect(KEYS.ARROW_DOWN).toBe("ArrowDown");
    expect(KEYS.HOME).toBe("Home");
    expect(KEYS.END).toBe("End");
  });
});

/* ── Arrow Key Handler ── */
describe("createArrowKeyHandler", () => {
  it("creates a function", () => {
    const handler = createArrowKeyHandler([]);
    expect(typeof handler).toBe("function");
  });

  it("accepts orientation and loop options", () => {
    const handler = createArrowKeyHandler([], {
      orientation: "horizontal",
      loop: false,
      onSelect: () => {},
    });
    expect(typeof handler).toBe("function");
  });
});

/* ── Audit Summary ── */
describe("summarizeAudit", () => {
  it("returns perfect score for no issues", () => {
    const result = summarizeAudit([]);
    expect(result).toEqual({ errors: 0, warnings: 0, info: 0, score: 100 });
  });

  it("deducts 10 per error", () => {
    const issues: A11yIssue[] = [
      { element: "img", rule: "img-alt", severity: "error", message: "Missing alt" },
      { element: "btn", rule: "name", severity: "error", message: "No name" },
    ];
    const result = summarizeAudit(issues);
    expect(result.errors).toBe(2);
    expect(result.score).toBe(80);
  });

  it("deducts 3 per warning", () => {
    const issues: A11yIssue[] = [
      { element: "doc", rule: "h1", severity: "warning", message: "Multiple H1" },
    ];
    expect(summarizeAudit(issues).score).toBe(97);
  });

  it("clamps score at 0", () => {
    const issues: A11yIssue[] = Array.from({ length: 15 }, (_, i) => ({
      element: `el-${i}`,
      rule: "test",
      severity: "error" as const,
      message: "Err",
    }));
    expect(summarizeAudit(issues).score).toBe(0);
  });
});

/* ── Focus Management ── */
describe("getFocusableElements", () => {
  it("finds focusable elements in container", () => {
    const div = document.createElement("div");
    div.innerHTML = `
      <button>Click</button>
      <a href="#">Link</a>
      <input type="text" />
      <input type="hidden" />
      <button disabled>Disabled</button>
      <div tabindex="0">Custom</div>
      <div tabindex="-1">Not focusable</div>
    `;
    document.body.appendChild(div);
    const elements = getFocusableElements(div);
    // button, a, input[text], div[tabindex=0] = 4 (disabled & hidden & tabindex=-1 excluded)
    expect(elements.length).toBe(4);
    document.body.removeChild(div);
  });
});

/* ── ARIA ID Generator ── */
describe("generateAriaId", () => {
  it("generates unique IDs", () => {
    const id1 = generateAriaId("test");
    const id2 = generateAriaId("test");
    expect(id1).not.toBe(id2);
    expect(id1.startsWith("test-")).toBe(true);
  });

  it("uses default prefix", () => {
    const id = generateAriaId();
    expect(id.startsWith("a11y-")).toBe(true);
  });
});
