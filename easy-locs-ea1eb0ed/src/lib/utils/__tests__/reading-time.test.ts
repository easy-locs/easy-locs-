import { describe, it, expect } from "vitest";
import { getReadingTime } from "@/lib/utils/reading-time";

describe("getReadingTime", () => {
  it("returns null for an empty string", () => {
    expect(getReadingTime("")).toBeNull();
  });

  it("returns null for a whitespace-only string", () => {
    expect(getReadingTime("   ")).toBeNull();
    expect(getReadingTime("\t\n  ")).toBeNull();
  });

  it("returns 1 min for a single word", () => {
    expect(getReadingTime("Hello")).toBe(1);
  });

  it("returns 1 min for up to 200 words", () => {
    const words = Array(200).fill("word").join(" ");
    expect(getReadingTime(words)).toBe(1);
  });

  it("returns 2 min for 201 words", () => {
    const words = Array(201).fill("word").join(" ");
    expect(getReadingTime(words)).toBe(2);
  });

  it("returns 2 min for 400 words", () => {
    const words = Array(400).fill("word").join(" ");
    expect(getReadingTime(words)).toBe(2);
  });

  it("returns 3 min for 401 words", () => {
    const words = Array(401).fill("word").join(" ");
    expect(getReadingTime(words)).toBe(3);
  });

  it("returns 5 min for 1000 words", () => {
    const words = Array(1000).fill("word").join(" ");
    expect(getReadingTime(words)).toBe(5);
  });

  it("trims leading and trailing whitespace before counting", () => {
    const words = "  " + Array(200).fill("word").join(" ") + "  ";
    expect(getReadingTime(words)).toBe(1);
  });

  it("handles multiple spaces between words correctly", () => {
    const text = "one   two   three   four   five";
    expect(getReadingTime(text)).toBe(1);
  });

  it("handles newlines and tabs as word separators", () => {
    const text = "one\ntwo\tthree\n\nfour";
    expect(getReadingTime(text)).toBe(1);
  });
});
