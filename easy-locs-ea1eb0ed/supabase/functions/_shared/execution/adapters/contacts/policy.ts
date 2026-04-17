/**
 * Contacts adapter framework — lock + idempotency policy (task #945).
 *
 * Sync runs lock per (provider) so two concurrent provider pulls
 * serialise. Upsert batches lock per (table, source) so concurrent
 * imports from different sources can interleave but two re-runs of the
 * same source serialise.
 */

import { CONTACTS_DOMAINS, type ContactsDomain } from "./types.ts";

export function contactsSyncLockKey(provider: string): string {
  return `${CONTACTS_DOMAINS.SYNC}:provider:${provider}`;
}

export function contactsUpsertLockKey(table: string, source: string): string {
  return `${CONTACTS_DOMAINS.UPSERT}:${table}:${source}`;
}

export function contactsIdempotencyKey(
  domain: ContactsDomain,
  scope: string,
  payloadHash: string,
): string {
  return `${domain.toUpperCase()}::${scope}::${payloadHash}`;
}

/** FNV-1a 32-bit, dependency-free. */
export function hashContactsPayload(input: unknown): string {
  const s = typeof input === "string" ? input : JSON.stringify(input ?? "");
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
