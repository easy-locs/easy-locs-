/**
 * Orbit Alias Hardening — Context-specific, time-rotated aliases.
 * Prevents long-lived stable identifiers in secure Orbit flows.
 */

export type AliasContext = "message" | "call" | "share" | "qr";

const ROTATION_WINDOW_MS = 5 * 60_000; // 5-minute epochs

/** Create a context-bound alias from a base identity */
export function createOrbitAlias(baseAlias: string, context: AliasContext): string {
  const epoch = Math.floor(Date.now() / ROTATION_WINDOW_MS).toString(36);
  const entropy = crypto.getRandomValues(new Uint8Array(4));
  const suffix = Array.from(entropy)
    .map((b) => b.toString(36))
    .join("");
  return `${baseAlias}_${context}_${epoch}_${suffix}`;
}

/** Rotate an alias (just generates a new one for the same context) */
export function rotateOrbitAlias(baseAlias: string, context: AliasContext): string {
  return createOrbitAlias(baseAlias, context);
}

/** Get alias for a specific context (deterministic within epoch, no extra entropy) */
export function getAliasForContext(baseAlias: string, context: AliasContext): string {
  const epoch = Math.floor(Date.now() / ROTATION_WINDOW_MS).toString(36);
  return `${baseAlias}_${context}_${epoch}`;
}

/** Invalidate / forget an alias context from local cache */
const aliasCache = new Map<string, string>();

export function cacheAlias(context: AliasContext, alias: string): void {
  aliasCache.set(context, alias);
}

export function getCachedAlias(context: AliasContext): string | undefined {
  return aliasCache.get(context);
}

export function invalidateAliasContext(context: AliasContext): void {
  aliasCache.delete(context);
}

export function invalidateAllAliases(): void {
  aliasCache.clear();
}
