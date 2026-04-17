/**
 * Content adapter framework — lock + idempotency policy (task #945).
 *
 * Per-row writes lock per (table, id). Bulk runs lock per pipeline so two
 * concurrent invocations of the same pipeline serialise (e.g. a re-trigger
 * of the food normaliser cannot stomp on the previous run).
 */

import { CONTENT_DOMAINS, type ContentDomain } from "./types.ts";

export function contentRowLockKey(table: string, id: string): string {
  return `content.row:${table}:${id}`;
}

export function contentBulkLockKey(domain: ContentDomain, pipeline: string): string {
  return `${domain}:pipeline:${pipeline}`;
}

export function contentRowIdempotencyKey(
  table: string,
  op: string,
  id: string,
  payloadHash: string,
): string {
  return `CONTENT.ROW.${op.toUpperCase()}::${table}::${id}::${payloadHash}`;
}

export function contentBulkIdempotencyKey(
  domain: ContentDomain,
  pipeline: string,
  payloadHash: string,
): string {
  return `${domain.toUpperCase()}::${pipeline}::${payloadHash}`;
}

/** FNV-1a 32-bit, dependency-free (matches marketplace/policy.ts). */
export function hashContentPayload(input: unknown): string {
  const s = typeof input === "string" ? input : JSON.stringify(input ?? "");
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export { CONTENT_DOMAINS };
