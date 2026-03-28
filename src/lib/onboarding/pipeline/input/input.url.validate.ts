/**
 * input.url.validate — Validates whether a string is a valid URL.
 * ONE thing: URL syntax validation.
 */
import type { UrlValidationResult } from "../contracts";

export function validateUrl(raw: string): UrlValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) return { isUrl: false, isValid: false, error: "empty input" };

  // Quick heuristic: does it look like a URL?
  const looksLikeUrl =
    /^https?:\/\//i.test(trimmed) ||
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+/i.test(trimmed);

  if (!looksLikeUrl) return { isUrl: false, isValid: false, error: null };

  try {
    const withProtocol = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    new URL(withProtocol);
    return { isUrl: true, isValid: true, error: null };
  } catch {
    return { isUrl: true, isValid: false, error: "malformed URL" };
  }
}
