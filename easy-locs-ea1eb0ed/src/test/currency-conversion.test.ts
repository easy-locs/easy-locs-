import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";

// No supabase needed for this hook

describe("useCurrencyConversion", () => {
  it("returns baseCurrency for FR as EUR", async () => {
    const { useCurrencyConversion } = await import("@/hooks/useCurrencyConversion");
    const { result } = renderHook(() => useCurrencyConversion("FR"));
    expect(result.current.baseCurrency).toBe("EUR");
  });

  it("returns baseCurrency for US as USD", async () => {
    const { useCurrencyConversion } = await import("@/hooks/useCurrencyConversion");
    const { result } = renderHook(() => useCurrencyConversion("US"));
    expect(result.current.baseCurrency).toBe("USD");
  });

  it("converts same currency to same amount", async () => {
    const { useCurrencyConversion } = await import("@/hooks/useCurrencyConversion");
    const { result } = renderHook(() => useCurrencyConversion("FR"));
    expect(result.current.convert(1000, "EUR", "EUR")).toBe(1000);
  });

  it("converts USD to EUR with approximate rate", async () => {
    const { useCurrencyConversion } = await import("@/hooks/useCurrencyConversion");
    const { result } = renderHook(() => useCurrencyConversion("FR"));
    const converted = result.current.convert(100, "USD", "EUR");
    expect(converted).toBeGreaterThan(80);
    expect(converted).toBeLessThan(110);
  });

  it("formatCurrency produces valid output", async () => {
    const { useCurrencyConversion } = await import("@/hooks/useCurrencyConversion");
    const { result } = renderHook(() => useCurrencyConversion("FR"));
    const formatted = result.current.formatCurrency(1500, "EUR");
    expect(formatted).toContain("1");
    expect(formatted.length).toBeGreaterThan(3);
  });

  it("formatCurrency handles unknown currency gracefully", async () => {
    const { useCurrencyConversion } = await import("@/hooks/useCurrencyConversion");
    const { result } = renderHook(() => useCurrencyConversion("FR"));
    const formatted = result.current.formatCurrency(100, "XYZ");
    expect(formatted).toContain("100");
  });
});
