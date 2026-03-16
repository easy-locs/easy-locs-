/**
 * Validation & Forms Engine Tests
 */
import { describe, it, expect } from "vitest";
import {
  stripHTML,
  escapeHTML,
  normalizeWhitespace,
  sanitizeControl,
  sanitize,
  emailSchema,
  phoneSchema,
  safeText,
  safeTextarea,
  positiveNumber,
  nonNegativeNumber,
  currencyAmount,
  uuidSchema,
  urlSchema,
  dateStringSchema,
  monthSchema,
  passwordSchema,
  contactSchema,
  propertySchema,
  tenantSchema,
  leaseSchema,
  paymentSchema,
  validateForm,
  validateField,
  scorePassword,
} from "@/lib/validation";

/* ── Sanitization ── */
describe("stripHTML", () => {
  it("removes tags", () => {
    expect(stripHTML("<b>bold</b>")).toBe("bold");
    expect(stripHTML("<script>alert(1)</script>")).toBe("alert(1)");
    expect(stripHTML("plain")).toBe("plain");
  });
});

describe("escapeHTML", () => {
  it("escapes entities", () => {
    expect(escapeHTML('<div class="x">')).toBe("&lt;div class=&quot;x&quot;&gt;");
    expect(escapeHTML("a&b")).toBe("a&amp;b");
  });
});

describe("normalizeWhitespace", () => {
  it("collapses spaces", () => {
    expect(normalizeWhitespace("  a  b  ")).toBe("a b");
    expect(normalizeWhitespace("a\n\nb")).toBe("a b");
  });
});

describe("sanitizeControl", () => {
  it("removes null bytes", () => {
    expect(sanitizeControl("ab\x00c")).toBe("abc");
    expect(sanitizeControl("ok\x0Ftest")).toBe("oktest");
  });
});

describe("sanitize", () => {
  it("full pipeline", () => {
    expect(sanitize("  <b>hello</b>  \x00world  ")).toBe("hello world");
  });
});

/* ── Email Schema ── */
describe("emailSchema", () => {
  it("accepts valid email", () => {
    expect(emailSchema.parse("User@Example.COM")).toBe("user@example.com");
  });

  it("rejects invalid email", () => {
    expect(() => emailSchema.parse("not-email")).toThrow();
    expect(() => emailSchema.parse("")).toThrow();
  });

  it("trims whitespace", () => {
    expect(emailSchema.parse("  test@test.com  ")).toBe("test@test.com");
  });
});

/* ── Phone Schema ── */
describe("phoneSchema", () => {
  it("accepts valid phone", () => {
    expect(phoneSchema.parse("+33 6 12 34 56 78")).toBe("+33612345678");
  });

  it("rejects too short", () => {
    expect(() => phoneSchema.parse("123")).toThrow();
  });
});

/* ── Safe Text ── */
describe("safeText", () => {
  it("strips HTML and trims", () => {
    const schema = safeText(100);
    expect(schema.parse("  <b>hello</b>  ")).toBe("hello");
  });

  it("rejects over max length", () => {
    const schema = safeText(5);
    expect(() => schema.parse("toolong")).toThrow();
  });
});

/* ── Number Schemas ── */
describe("positiveNumber", () => {
  it("accepts positive", () => expect(positiveNumber.parse(5)).toBe(5));
  it("rejects zero", () => expect(() => positiveNumber.parse(0)).toThrow());
  it("rejects negative", () => expect(() => positiveNumber.parse(-1)).toThrow());
});

describe("nonNegativeNumber", () => {
  it("accepts zero", () => expect(nonNegativeNumber.parse(0)).toBe(0));
  it("rejects negative", () => expect(() => nonNegativeNumber.parse(-1)).toThrow());
});

describe("currencyAmount", () => {
  it("rounds to 2 decimals", () => {
    expect(currencyAmount.parse(42.999)).toBe(43);
    expect(currencyAmount.parse(10.125)).toBe(10.13);
  });

  it("rejects negative", () => {
    expect(() => currencyAmount.parse(-5)).toThrow();
  });
});

/* ── UUID Schema ── */
describe("uuidSchema", () => {
  it("accepts valid UUID", () => {
    expect(uuidSchema.parse("550e8400-e29b-41d4-a716-446655440000")).toBeDefined();
  });

  it("rejects invalid", () => {
    expect(() => uuidSchema.parse("not-uuid")).toThrow();
  });
});

/* ── URL Schema ── */
describe("urlSchema", () => {
  it("accepts valid URL", () => {
    expect(urlSchema.parse("https://example.com")).toBeDefined();
  });

  it("rejects invalid", () => {
    expect(() => urlSchema.parse("not-a-url")).toThrow();
  });
});

/* ── Date Schemas ── */
describe("dateStringSchema", () => {
  it("accepts YYYY-MM-DD", () => {
    expect(dateStringSchema.parse("2024-01-15")).toBe("2024-01-15");
  });

  it("rejects wrong format", () => {
    expect(() => dateStringSchema.parse("15/01/2024")).toThrow();
    expect(() => dateStringSchema.parse("2024-13-01")).toThrow(); // invalid month
  });
});

describe("monthSchema", () => {
  it("accepts YYYY-MM", () => {
    expect(monthSchema.parse("2024-01")).toBe("2024-01");
  });

  it("rejects wrong format", () => {
    expect(() => monthSchema.parse("Jan 2024")).toThrow();
  });
});

/* ── Password ── */
describe("passwordSchema", () => {
  it("accepts strong password", () => {
    expect(passwordSchema.parse("MyP@ss123")).toBeDefined();
  });

  it("rejects too short", () => {
    expect(() => passwordSchema.parse("Ab1")).toThrow();
  });

  it("rejects no uppercase", () => {
    expect(() => passwordSchema.parse("mypass123")).toThrow();
  });
});

/* ── Domain Schemas ── */
describe("contactSchema", () => {
  it("validates contact form", () => {
    const result = contactSchema.safeParse({
      name: "Jean",
      email: "jean@test.com",
      message: "Bonjour",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = contactSchema.safeParse({
      name: "",
      email: "jean@test.com",
      message: "Hello",
    });
    expect(result.success).toBe(false);
  });
});

describe("propertySchema", () => {
  it("validates with defaults", () => {
    const result = propertySchema.safeParse({
      title: "Studio",
      address: "1 rue test",
      city: "Paris",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.property_type).toBe("apartment");
    }
  });
});

describe("leaseSchema", () => {
  it("rejects end_date before start_date", () => {
    const result = leaseSchema.safeParse({
      tenant_id: "550e8400-e29b-41d4-a716-446655440000",
      property_id: "550e8400-e29b-41d4-a716-446655440001",
      start_date: "2024-06-01",
      end_date: "2024-01-01",
      rent_amount: 800,
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid lease", () => {
    const result = leaseSchema.safeParse({
      tenant_id: "550e8400-e29b-41d4-a716-446655440000",
      property_id: "550e8400-e29b-41d4-a716-446655440001",
      start_date: "2024-01-01",
      end_date: "2025-01-01",
      rent_amount: 800,
    });
    expect(result.success).toBe(true);
  });
});

/* ── Form Helpers ── */
describe("validateForm", () => {
  it("returns success with clean data", () => {
    const result = validateForm(emailSchema, "test@test.com");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("test@test.com");
  });

  it("returns errors on invalid", () => {
    const result = validateForm(emailSchema, "bad") as any;
    expect(result.success).toBe(false);
    expect(Object.keys(result.errors).length).toBeGreaterThan(0);
  });
});

describe("validateField", () => {
  it("returns null on valid", () => {
    expect(validateField(emailSchema, "a@b.com")).toBeNull();
  });

  it("returns error message on invalid", () => {
    const msg = validateField(emailSchema, "bad");
    expect(msg).toBeTruthy();
    expect(typeof msg).toBe("string");
  });
});

/* ── Password Scorer ── */
describe("scorePassword", () => {
  it("weak password scores low", () => {
    const result = scorePassword("abc");
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.label).toBe("weak");
  });

  it("strong password scores high", () => {
    const result = scorePassword("MyStr0ng!Pass");
    expect(result.score).toBeGreaterThanOrEqual(3);
    expect(["good", "strong"]).toContain(result.label);
  });

  it("provides feedback", () => {
    const result = scorePassword("short");
    expect(result.feedback.length).toBeGreaterThan(0);
  });
});
