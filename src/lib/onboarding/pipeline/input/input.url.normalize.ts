/**
 * input.url.normalize — Normalizes a validated URL into structured parts.
 * ONE thing: clean and decompose URL.
 */
import type { NormalizedUrl } from "../contracts";

export function normalizeUrl(raw: string): NormalizedUrl {
  const trimmed = raw.trim();
  const withProtocol = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    return {
      original: raw,
      normalized: parsed.href.replace(/\/+$/, ""),
      protocol: parsed.protocol.replace(":", ""),
      hostname: parsed.hostname.replace(/^www\./, ""),
      pathname: parsed.pathname,
      search: parsed.search,
    };
  } catch {
    return {
      original: raw,
      normalized: withProtocol,
      protocol: "https",
      hostname: "",
      pathname: "/",
      search: "",
    };
  }
}
