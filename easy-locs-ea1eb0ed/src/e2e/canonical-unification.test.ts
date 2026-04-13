/**
 * E2E tests for canonical text/identity/preview unification.
 * Validates that a SINGLE source of truth exists for each concern.
 */
import { describe, it, expect } from "vitest";
import { normalizeTextInput, normalizeSearchableText, validateTextInput } from "@/domains/orbit/resolvers/text.resolver";
import { resolveDisplayName, resolveAvatar } from "@/domains/orbit/resolvers/identity.resolver";
import { buildMessagePreview } from "@/domains/orbit/resolvers/preview.resolver";

// ══════════════════════════════════════════════
// TEXT NORMALIZER
// ══════════════════════════════════════════════

describe("normalizeTextInput — single canonical text normalizer", () => {
  it("preserves normal text", () => {
    expect(normalizeTextInput("Hello world")).toBe("Hello world");
  });

  it("returns null for empty/whitespace", () => {
    expect(normalizeTextInput("")).toBeNull();
    expect(normalizeTextInput("   ")).toBeNull();
    expect(normalizeTextInput(null)).toBeNull();
    expect(normalizeTextInput(undefined)).toBeNull();
  });

  it("trims leading/trailing whitespace", () => {
    expect(normalizeTextInput("  hello  ")).toBe("hello");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeTextInput("hello    world")).toBe("hello world");
  });

  it("limits consecutive newlines to 2", () => {
    expect(normalizeTextInput("a\n\n\n\n\nb")).toBe("a\n\nb");
  });

  it("strips zero-width characters", () => {
    expect(normalizeTextInput("hello\u200Bworld")).toBe("helloworld");
    expect(normalizeTextInput("test\uFEFFvalue")).toBe("testvalue");
  });

  it("preserves emoji", () => {
    expect(normalizeTextInput("Hello 👋🏽 World 🌍")).toBe("Hello 👋🏽 World 🌍");
  });

  it("preserves Arabic text", () => {
    expect(normalizeTextInput("مرحبا بالعالم")).toBe("مرحبا بالعالم");
  });

  it("preserves accented characters", () => {
    expect(normalizeTextInput("café résumé naïve")).toBe("café résumé naïve");
  });

  it("preserves special punctuation", () => {
    expect(normalizeTextInput("It's a test! (yes) [no] {maybe} <ok>")).toBe("It's a test! (yes) [no] {maybe} <ok>");
  });

  it("preserves mixed scripts", () => {
    expect(normalizeTextInput("Hello مرحبا 你好 🎉")).toBe("Hello مرحبا 你好 🎉");
  });
});

// ══════════════════════════════════════════════
// SEARCH NORMALIZER
// ══════════════════════════════════════════════

describe("normalizeSearchableText — single canonical search normalizer", () => {
  it("lowercases", () => {
    expect(normalizeSearchableText("Hello World")).toBe("hello world");
  });

  it("folds accents", () => {
    expect(normalizeSearchableText("café résumé")).toBe("cafe resume");
  });

  it("returns empty for null/undefined", () => {
    expect(normalizeSearchableText(null)).toBe("");
    expect(normalizeSearchableText(undefined)).toBe("");
  });

  it("collapses whitespace", () => {
    expect(normalizeSearchableText("hello   world")).toBe("hello world");
  });

  it("handles emoji in search", () => {
    const result = normalizeSearchableText("Hello 👋 World");
    expect(result).toContain("hello");
    expect(result).toContain("world");
  });
});

// ══════════════════════════════════════════════
// TEXT VALIDATOR
// ══════════════════════════════════════════════

describe("validateTextInput — single canonical text validator", () => {
  it("returns null for valid text", () => {
    expect(validateTextInput("Hello")).toBeNull();
  });

  it("rejects empty", () => {
    expect(validateTextInput("")).toBe("empty_body");
    expect(validateTextInput("   ")).toBe("empty_body");
    expect(validateTextInput(null)).toBe("empty_body");
  });

  it("rejects too long", () => {
    const long = "a".repeat(10_001);
    expect(validateTextInput(long)).toBe("body_too_long");
  });

  it("accepts max length", () => {
    const exact = "a".repeat(10_000);
    expect(validateTextInput(exact)).toBeNull();
  });
});

// ══════════════════════════════════════════════
// DISPLAY NAME RESOLVER
// ══════════════════════════════════════════════

describe("resolveDisplayName — single canonical identity resolver", () => {
  it("uses displayName first", () => {
    expect(resolveDisplayName({ displayName: "Alice", name: "Bob" })).toBe("Alice");
  });

  it("falls back to name", () => {
    expect(resolveDisplayName({ name: "Bob" })).toBe("Bob");
  });

  it("combines firstName + lastName", () => {
    expect(resolveDisplayName({ firstName: "John", lastName: "Doe" })).toBe("John Doe");
  });

  it("combines first_name + last_name", () => {
    expect(resolveDisplayName({ first_name: "Jane", last_name: "Smith" })).toBe("Jane Smith");
  });

  it("falls back to default when only email provided (email is private)", () => {
    expect(resolveDisplayName({ email: "user@example.com" })).toBe("Contact");
  });

  it("falls back to phone", () => {
    expect(resolveDisplayName({ phone: "+971501234567" })).toBe("+971501234567");
  });

  it("returns fallback for empty source", () => {
    expect(resolveDisplayName(null)).toBe("Contact");
    expect(resolveDisplayName({})).toBe("Contact");
  });

  it("uses custom fallback", () => {
    expect(resolveDisplayName(null, "Unknown")).toBe("Unknown");
  });

  it("trims whitespace", () => {
    expect(resolveDisplayName({ displayName: "  Alice  " })).toBe("Alice");
  });
});

// ══════════════════════════════════════════════
// AVATAR RESOLVER
// ══════════════════════════════════════════════

describe("resolveAvatar — single canonical avatar resolver", () => {
  it("uses avatarUrl first", () => {
    expect(resolveAvatar({ avatarUrl: "https://a.com/1.jpg", avatar_url: "https://b.com/2.jpg" }))
      .toBe("https://a.com/1.jpg");
  });

  it("falls back to avatar_url", () => {
    expect(resolveAvatar({ avatar_url: "https://b.com/2.jpg" })).toBe("https://b.com/2.jpg");
  });

  it("falls back to photo_url", () => {
    expect(resolveAvatar({ photo_url: "https://c.com/3.jpg" })).toBe("https://c.com/3.jpg");
  });

  it("returns null for empty", () => {
    expect(resolveAvatar(null)).toBeNull();
    expect(resolveAvatar({})).toBeNull();
  });
});

// ══════════════════════════════════════════════
// MESSAGE PREVIEW BUILDER
// ══════════════════════════════════════════════

describe("buildMessagePreview — single canonical preview builder", () => {
  it("returns text for text messages", () => {
    expect(buildMessagePreview({ type: "text", text: "Hello world" })).toBe("Hello world");
  });

  it("truncates long text", () => {
    const long = "a".repeat(100);
    const result = buildMessagePreview({ type: "text", text: long }, 80);
    expect(result.length).toBeLessThanOrEqual(81); // 80 + "…"
    expect(result.endsWith("…")).toBe(true);
  });

  it("returns type preview for image", () => {
    expect(buildMessagePreview({ type: "image" })).toBe("📷 Photo");
  });

  it("returns type preview with caption for image", () => {
    expect(buildMessagePreview({ type: "image", text: "Beach" })).toBe("📷 Photo: Beach");
  });

  it("returns type preview for voice", () => {
    expect(buildMessagePreview({ type: "voice" })).toBe("🎙️ Voice message");
  });

  it("returns type preview for video", () => {
    expect(buildMessagePreview({ type: "video" })).toBe("🎬 Video");
  });

  it("returns type preview for file", () => {
    expect(buildMessagePreview({ type: "file" })).toBe("📎 File");
  });

  it("returns type preview for location", () => {
    expect(buildMessagePreview({ type: "location_static" })).toBe("📍 Location");
  });

  it("handles deleted messages", () => {
    expect(buildMessagePreview({ type: "text", isDeleted: true })).toBe("🚫 Message deleted");
  });

  it("handles failed messages", () => {
    expect(buildMessagePreview({ type: "text", status: "failed" })).toBe("⚠️ Message failed");
  });

  it("handles e2e encrypted files", () => {
    expect(buildMessagePreview({ type: "text", text: "e2e-file:abc123" })).toBe("📎 Encrypted file");
  });

  it("returns empty for null", () => {
    expect(buildMessagePreview(null)).toBe("");
  });
});
