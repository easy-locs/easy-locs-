/**
 * Content adapter framework — payload typings + validation (task #945).
 *
 * Two task-type tiers, both registered against the canonical risk
 * classifier in `src/core/execution/risk-classification.ts`:
 *
 *   - per-row writes  → `NON_CRITICAL_DATA_FIX` (MEDIUM, no approval)
 *   - bulk pipelines  → `NON_SENSITIVE_BULK_UPDATE` (MEDIUM, approval-gated)
 *
 * Multiple adapters share the same canonical task type but live under
 * sub-domains (`content.row`, `content.food`, `content.search`,
 * `content.shop`, `content.media`) so the (domain, task_type) routing
 * key in `globalAdapterRegistry` stays unique.
 */

export const CONTENT_DOMAINS = {
  ROW: "content.row",
  FOOD: "content.food",
  SEARCH: "content.search",
  SHOP: "content.shop",
  MEDIA: "content.media",
} as const;

export type ContentDomain = (typeof CONTENT_DOMAINS)[keyof typeof CONTENT_DOMAINS];

export const CONTENT_TASK_TYPES = {
  ROW_WRITE: "NON_CRITICAL_DATA_FIX",
  BULK_RUN: "NON_SENSITIVE_BULK_UPDATE",
} as const;

export const CONTENT_ERROR_CODES = {
  INVALID_PAYLOAD: "INVALID_PAYLOAD",
  TABLE_NOT_ALLOWED: "TABLE_NOT_ALLOWED",
  ROW_NOT_FOUND: "ROW_NOT_FOUND",
  MUTATION_FAILED: "MUTATION_FAILED",
  PIPELINE_FAILED: "PIPELINE_FAILED",
  VERIFICATION_MISMATCH: "VERIFICATION_MISMATCH",
  VERIFICATION_LOOKUP_FAILED: "VERIFICATION_LOOKUP_FAILED",
} as const;

export type ContentErrorCode =
  (typeof CONTENT_ERROR_CODES)[keyof typeof CONTENT_ERROR_CODES];

/** Per-row write op. `op` selects insert | update | upsert | delete. */
export interface ContentRowWritePayload {
  table: string;
  op: "insert" | "update" | "upsert" | "delete";
  /** Required for update/delete; optional for insert/upsert. */
  id?: string;
  /** Row values for insert/update/upsert. */
  values?: Record<string, unknown>;
  /** Optional caller hash for idempotency. */
  payload_hash?: string;
  /** When true, the verifier asserts the row reflects every key in values. */
  strict_verify?: boolean;
}

/** Bulk-pipeline run. `pipeline` is the bespoke runner key. */
export interface ContentBulkRunPayload {
  /** Pipeline key — registered runners look this up. */
  pipeline: string;
  /** Free-form parameters forwarded to the runner. */
  params?: Record<string, unknown>;
  /** Caller-supplied idempotency hash. */
  payload_hash?: string;
  /** Optional max rows the runner is permitted to touch in a single run. */
  row_budget?: number;
}

/** Snapshot of a single row, used by per-row rollback. */
export interface ContentRowSnapshot {
  table: string;
  id: string;
  /** Full row at snapshot time (null when the row didn't yet exist). */
  row: Record<string, unknown> | null;
}

export interface ValidationResult<T> {
  ok: boolean;
  data?: T;
  reason?: string;
}

/** Allowed write tables. Locked down to prevent the generic adapter from
 *  becoming an open writable surface. New tables MUST be added here
 *  consciously alongside the adapter migration that needs them. */
export const CONTENT_WRITE_TABLE_ALLOWLIST: ReadonlySet<string> = new Set([
  // Storefront / catalogue
  "products", "product_variants", "shops", "shop_items",
  "menus", "menu_items", "menu_categories",
  "hotels", "hotel_rooms", "hotel_room_types",
  "rentals", "rental_units",
  // Orders + carts
  "orders", "order_items", "carts", "cart_items", "saved_carts",
  // Wishlist / favourites / reviews
  "wishlists", "wishlist_items", "favorites", "reviews",
  // Loyalty / coupons
  "loyalty_accounts", "loyalty_ledger", "coupons", "coupon_redemptions",
  // Onboarding pipeline persistence
  "canonical_records", "import_runs", "review_queue_items",
  // Groups + Orbit conversation surface (storefront facet only)
  "groups", "group_memberships", "group_conversations",
  // Misc per-row content
  "qr_codes", "search_history", "ranking_rows",
]);

const TRIM_STR_KEYS = new Set(["table", "id", "op", "pipeline"]);

function tidyString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function validateRowWritePayload(
  p: unknown,
): ValidationResult<ContentRowWritePayload> {
  if (!p || typeof p !== "object") return { ok: false, reason: "payload must be an object" };
  const obj = p as Record<string, unknown>;
  const table = tidyString(obj.table);
  const op = tidyString(obj.op).toLowerCase() as ContentRowWritePayload["op"];
  if (!table) return { ok: false, reason: "table is required" };
  if (!CONTENT_WRITE_TABLE_ALLOWLIST.has(table)) {
    return { ok: false, reason: `table "${table}" is not in CONTENT_WRITE_TABLE_ALLOWLIST` };
  }
  if (!["insert", "update", "upsert", "delete"].includes(op)) {
    return { ok: false, reason: `op must be one of insert | update | upsert | delete (got "${op}")` };
  }
  const id = tidyString(obj.id) || undefined;
  if ((op === "update" || op === "delete") && !id) {
    return { ok: false, reason: `op "${op}" requires an id` };
  }
  let values: Record<string, unknown> | undefined;
  if (op !== "delete") {
    if (!obj.values || typeof obj.values !== "object") {
      return { ok: false, reason: `op "${op}" requires a values object` };
    }
    values = obj.values as Record<string, unknown>;
  }
  void TRIM_STR_KEYS;
  return {
    ok: true,
    data: {
      table,
      op,
      id,
      values,
      payload_hash: typeof obj.payload_hash === "string" ? obj.payload_hash : undefined,
      strict_verify: obj.strict_verify === true,
    },
  };
}

export function validateBulkRunPayload(
  p: unknown,
): ValidationResult<ContentBulkRunPayload> {
  if (!p || typeof p !== "object") return { ok: false, reason: "payload must be an object" };
  const obj = p as Record<string, unknown>;
  const pipeline = tidyString(obj.pipeline);
  if (!pipeline) return { ok: false, reason: "pipeline is required" };
  const rowBudget = typeof obj.row_budget === "number" && Number.isFinite(obj.row_budget)
    ? Math.max(0, Math.floor(obj.row_budget))
    : undefined;
  const params = obj.params && typeof obj.params === "object"
    ? (obj.params as Record<string, unknown>)
    : undefined;
  return {
    ok: true,
    data: {
      pipeline,
      params,
      payload_hash: typeof obj.payload_hash === "string" ? obj.payload_hash : undefined,
      row_budget: rowBudget,
    },
  };
}
