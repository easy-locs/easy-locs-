/**
 * Unified Deep-Link Hook
 * 
 * Shared logic for consuming URL params (booking, record, tab, country)
 * across all modules. Prevents duplicate deep-link application.
 * 
 * Usage:
 *   const { bookingId, recordId, tab, country, clearParam } = useDeepLink();
 */
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type { DeepLinkParams } from "./types";

export function useDeepLink() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const bookingId = searchParams.get("booking") || null;
  const recordId = searchParams.get("record") || null;
  const tab = searchParams.get("tab") || null;
  const country = searchParams.get("country") || null;

  /** Mark a param as consumed and remove it from the URL */
  const clearParam = useCallback((param: keyof DeepLinkParams) => {
    setApplied((prev) => new Set(prev).add(param));
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete(param);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  /** Clear multiple params at once */
  const clearParams = useCallback((...params: (keyof DeepLinkParams)[]) => {
    setApplied((prev) => {
      const next = new Set(prev);
      params.forEach((p) => next.add(p));
      return next;
    });
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      params.forEach((p) => next.delete(p));
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  /** Check if a specific deep-link param has already been consumed */
  const isApplied = useCallback((param: keyof DeepLinkParams) => applied.has(param), [applied]);

  return {
    bookingId,
    recordId,
    tab,
    country,
    clearParam,
    clearParams,
    isApplied,
    searchParams,
    setSearchParams,
  };
}

/**
 * Scroll to an element and highlight it temporarily.
 * Used by destination pages when deep-linking to a specific record.
 */
export function scrollToAndHighlight(elementId: string, durationMs: number = 3000): boolean {
  const el = document.getElementById(elementId);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("ring-2", "ring-accent");
  setTimeout(() => el.classList.remove("ring-2", "ring-accent"), durationMs);
  return true;
}
