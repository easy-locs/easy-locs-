/**
 * Contacts adapter framework — payload typings + validation (task #945).
 *
 * Two operations are governed:
 *
 *   contacts.sync   — pull/refresh contacts from an upstream provider
 *                     (DLD, UAE scrape, prayer-times, auto-onboarding cron,
 *                     tenant-signup, address-resolver, etc.)
 *   contacts.upsert — bulk write a batch of contact rows
 *
 * Both register against the canonical `NON_SENSITIVE_BULK_UPDATE` task
 * type so the dispatcher applies MEDIUM-with-approval gating per
 * `MEDIUM_TASK_APPROVAL_POLICY`.
 */

export const CONTACTS_DOMAINS = {
  SYNC: "contacts.sync",
  UPSERT: "contacts.upsert",
} as const;

export type ContactsDomain = (typeof CONTACTS_DOMAINS)[keyof typeof CONTACTS_DOMAINS];

export const CONTACTS_TASK_TYPE = "NON_SENSITIVE_BULK_UPDATE";

export const CONTACTS_ERROR_CODES = {
  INVALID_PAYLOAD: "INVALID_PAYLOAD",
  PROVIDER_NOT_REGISTERED: "PROVIDER_NOT_REGISTERED",
  SYNC_FAILED: "SYNC_FAILED",
  UPSERT_FAILED: "UPSERT_FAILED",
  VERIFICATION_MISMATCH: "VERIFICATION_MISMATCH",
} as const;

export type ContactsErrorCode =
  (typeof CONTACTS_ERROR_CODES)[keyof typeof CONTACTS_ERROR_CODES];

/** Sync payload: pull contacts from an upstream provider. */
export interface ContactsSyncPayload {
  /** Provider key — registered runners look this up. */
  provider: string;
  /** Free-form parameters forwarded to the runner (e.g. `{ since: ... }`). */
  params?: Record<string, unknown>;
  /** Caller-supplied idempotency hash. */
  payload_hash?: string;
  /** Cap on rows touched in a single run. */
  row_budget?: number;
}

/** Upsert payload: caller hands the adapter a batch of rows. */
export interface ContactsUpsertPayload {
  /** Logical batch source (e.g. "tenant-signup", "auto-onboarding-cron"). */
  source: string;
  /** Target table — restricted to the contacts allowlist. */
  table: string;
  /** Row payloads. The adapter does not inspect column shape. */
  rows: Array<Record<string, unknown>>;
  /** Optional caller-supplied per-row primary key column (default `id`). */
  conflict_key?: string;
  /** Caller-supplied idempotency hash. */
  payload_hash?: string;
}

/** Allowlisted contacts tables. Mirrors §5 of the P4 phase plan. */
export const CONTACTS_TABLE_ALLOWLIST: ReadonlySet<string> = new Set([
  "contacts",
  "contact_groups",
  "contact_group_members",
  "tenant_signups",
  "onboarding_pipeline",
  "onboarding_providers",
  "social_graph_edges",
  "address_book_entries",
  "addresses",
  "prayer_subscriptions",
  "dld_records",
  "uae_scrape_records",
  "badges",
  "workspaces",
]);

export interface ValidationResult<T> {
  ok: boolean;
  data?: T;
  reason?: string;
}

function tidyString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function validateSyncPayload(p: unknown): ValidationResult<ContactsSyncPayload> {
  if (!p || typeof p !== "object") return { ok: false, reason: "payload must be an object" };
  const obj = p as Record<string, unknown>;
  const provider = tidyString(obj.provider);
  if (!provider) return { ok: false, reason: "provider is required" };
  return {
    ok: true,
    data: {
      provider,
      params: obj.params && typeof obj.params === "object"
        ? (obj.params as Record<string, unknown>)
        : undefined,
      payload_hash: typeof obj.payload_hash === "string" ? obj.payload_hash : undefined,
      row_budget: typeof obj.row_budget === "number" && Number.isFinite(obj.row_budget)
        ? Math.max(0, Math.floor(obj.row_budget))
        : undefined,
    },
  };
}

export function validateUpsertPayload(p: unknown): ValidationResult<ContactsUpsertPayload> {
  if (!p || typeof p !== "object") return { ok: false, reason: "payload must be an object" };
  const obj = p as Record<string, unknown>;
  const source = tidyString(obj.source);
  const table = tidyString(obj.table);
  if (!source) return { ok: false, reason: "source is required" };
  if (!table) return { ok: false, reason: "table is required" };
  if (!CONTACTS_TABLE_ALLOWLIST.has(table)) {
    return { ok: false, reason: `table "${table}" is not in CONTACTS_TABLE_ALLOWLIST` };
  }
  if (!Array.isArray(obj.rows)) {
    return { ok: false, reason: "rows must be an array" };
  }
  if (obj.rows.length === 0) {
    return { ok: false, reason: "rows must contain at least one row" };
  }
  return {
    ok: true,
    data: {
      source,
      table,
      rows: obj.rows as Array<Record<string, unknown>>,
      conflict_key: tidyString(obj.conflict_key) || undefined,
      payload_hash: typeof obj.payload_hash === "string" ? obj.payload_hash : undefined,
    },
  };
}
