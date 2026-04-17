/**
 * Frontend ↔ Edge Function explicit contract registry.
 *
 * The contract-matrix script (`scripts/edge-function-contract-matrix.ts`)
 * uses this file as the source of truth for per-function request/response
 * shapes, accepted HTTP methods, and required headers. Any function listed
 * here is verified against every call site in `src/` and a CI failure is
 * raised on the following mismatches:
 *
 *   - method incompatibility (caller method not in `methods`)
 *   - missing required body field (caller body literal is missing a key
 *     listed in `requestBody.required`)
 *   - missing required auth header for a `fetch()` call (manifest says
 *     `auth: jwt` and `requireAuthHeader` is true)
 *
 * Functions NOT listed here are still inventoried in the matrix (existence,
 * caller count, inferred handler methods) but are not subject to per-field
 * contract verification — they are treated as "contract coverage gap" and
 * counted in the coverage metric.
 *
 * Keep entries alphabetical and prefer narrow, accurate declarations over
 * speculative ones. A wrong required field is worse than no declaration.
 */

export interface FieldSpec {
  /** Top-level keys callers MUST supply in the request body. */
  required: string[];
  /** Top-level keys callers MAY supply (informational only). */
  optional?: string[];
}

export interface ResponseSpec {
  /** Top-level keys the function is documented to return on success. */
  fields: string[];
  /** HTTP statuses the function may return on success. */
  successStatuses?: number[];
}

export interface ErrorSpec {
  status: number;
  /** Stable error code in the JSON response body, if any. */
  code?: string;
  reason: string;
}

export interface ContractEntry {
  /** HTTP methods the handler accepts (OPTIONS is always implied). */
  methods: ("GET" | "POST" | "PUT" | "PATCH" | "DELETE")[];
  /** Body shape expectations for non-GET requests. */
  requestBody?: FieldSpec;
  /** Documented success response shape. */
  response?: ResponseSpec;
  /** Documented error responses. */
  errors?: ErrorSpec[];
  /**
   * If true and a `fetch()` (not `functions.invoke`) call site targets this
   * function, the call site MUST pass `headers:` with an Authorization
   * bearer. Defaults to true when the security manifest marks `auth: jwt`.
   * Set explicitly here only to override the default.
   */
  requireAuthHeader?: boolean;
  /** Free-form note shown in the generated markdown matrix. */
  note?: string;
}

export const EDGE_FUNCTION_CONTRACTS: Record<string, ContractEntry> = {
  "ai-assistant": {
    methods: ["POST"],
    requestBody: { required: ["messages"], optional: ["language", "stream", "context", "model"] },
    response: { fields: ["reply"], successStatuses: [200] },
    errors: [
      { status: 401, reason: "Missing or invalid JWT" },
      { status: 429, reason: "Rate limit exceeded" },
    ],
  },
  "audit-export": {
    methods: ["GET"],
    response: { fields: [], successStatuses: [200] },
    errors: [
      { status: 400, reason: "Bad format query parameter" },
      { status: 401, reason: "Missing or invalid JWT" },
    ],
    note: "format query parameter must be one of: csv, pdf, json",
  },
  "booking-create": {
    methods: ["POST"],
    requestBody: {
      required: ["listing_id", "check_in", "check_out"],
      optional: ["guests", "guest_id", "notes", "promo_code"],
    },
    response: { fields: ["booking_id", "result"], successStatuses: [200, 201] },
    errors: [
      { status: 400, reason: "Date overlap or invalid range" },
      { status: 401, reason: "Missing Authorization header" },
      { status: 429, reason: "Rate limit exceeded" },
    ],
  },
  "create-stripe-intent": {
    methods: ["POST"],
    requestBody: { required: ["amount", "currency"], optional: ["metadata", "customer_id"] },
    response: { fields: ["clientSecret"], successStatuses: [200] },
    errors: [{ status: 401, reason: "Missing or invalid JWT" }],
  },
  "gdpr-delete-account": {
    methods: ["POST"],
    response: { fields: ["status"], successStatuses: [200] },
    errors: [{ status: 401, reason: "Missing or invalid JWT" }],
    requireAuthHeader: true,
  },
  "gdpr-export": {
    // Download endpoint — frontend uses GET with Authorization to receive
    // the export blob directly.
    methods: ["GET", "POST"],
    response: { fields: [], successStatuses: [200] },
    errors: [{ status: 401, reason: "Missing or invalid JWT" }],
    requireAuthHeader: true,
  },
  "health-check": {
    methods: ["GET"],
    response: { fields: ["status", "checks", "totalMs"], successStatuses: [200] },
  },
  "rent-payment": {
    methods: ["POST"],
    requestBody: { required: ["mode"], optional: ["lease_id", "amount", "currency", "metadata"] },
    response: { fields: ["url", "country"], successStatuses: [200] },
    errors: [{ status: 401, reason: "Missing or invalid JWT" }],
  },
  "vector-similarity-search": {
    methods: ["POST"],
    requestBody: {
      required: [],
      optional: ["query_embedding", "query_text", "user_id", "match_count", "similarity_threshold"],
    },
    response: { fields: ["matches"], successStatuses: [200] },
    errors: [
      { status: 400, reason: "Neither query_embedding nor query_text provided, or query_embedding has wrong dimensions" },
      { status: 401, reason: "Missing or invalid JWT" },
      { status: 502, reason: "Embedding provider failure when query_text supplied" },
      { status: 405, reason: "Non-POST method" },
    ],
    note: "Runs pgvector cosine similarity across listings, marketplace_services, and seed_products via the match_embeddings RPC (#903).",
  },
  "send-email": {
    methods: ["POST"],
    requestBody: {
      required: ["to", "subject"],
      optional: ["html", "body", "text", "from", "replyTo", "cc", "bcc", "category", "metadata"],
    },
    response: { fields: ["success", "id"], successStatuses: [200] },
    errors: [
      { status: 400, reason: "Missing required fields (to, subject, and one of html/body/text)" },
      { status: 401, reason: "Unauthorized — missing or invalid JWT" },
    ],
    note: "Handler accepts either `html`, `body`, or `text` as the email body field",
  },
  "presence-heartbeat": {
    methods: ["POST"],
    requestBody: { required: [], optional: ["status", "context"] },
    response: { fields: ["ok", "online", "presence", "lastSeen", "users", "active_users"], successStatuses: [200] },
    errors: [{ status: 400, reason: "Bad heartbeat payload" }, { status: 503, reason: "Backend unavailable" }],
  },
  "dispatch-delivery": {
    methods: ["POST"],
    requestBody: {
      required: ["action"],
      optional: ["job_id", "order_id", "confirmation_code", "gps_lat", "gps_lng", "gps_accuracy", "reason", "pickup", "dropoff", "notes"],
    },
    response: { fields: ["data"], successStatuses: [200] },
    note: "action selects subcommand (escrow_status, confirm, cancel, etc.)",
  },
  "fx-rates": {
    methods: ["GET", "POST"],
    response: { fields: ["rates", "result", "value"], successStatuses: [200] },
    errors: [
      { status: 400, reason: "Unsupported currency" },
      { status: 503, reason: "All FX sources unavailable" },
    ],
    note: "Query parameters or POST body: action, from, to, amount",
  },
  "redis-proxy": {
    methods: ["POST"],
    requestBody: {
      required: ["action"],
      optional: ["key", "value", "ttl_seconds", "keys", "seconds", "args"],
    },
    response: { fields: ["value", "result", "deleted"], successStatuses: [200] },
    errors: [
      { status: 400, reason: "Bad action or arguments" },
      { status: 403, reason: "Operation forbidden for caller" },
      { status: 503, reason: "Redis unavailable" },
    ],
  },
  "s3-upload-proxy": {
    methods: ["POST"],
    requestBody: {
      required: ["bucket", "path"],
      optional: ["action", "contentType", "metadata", "fileSize", "expiresIn"],
    },
    response: { fields: ["url", "uploadUrl", "downloadUrl", "success", "exists"], successStatuses: [200] },
    errors: [
      { status: 400, reason: "Bad request" },
      { status: 403, reason: "Forbidden" },
      { status: 500, reason: "S3 error" },
      { status: 503, reason: "S3 unavailable" },
    ],
    note: "action defaults to upload; getSignedUrl/delete take action explicitly",
  },
  "gateway-marketplace-sync": {
    methods: ["POST"],
    requestBody: { required: ["source"], optional: ["since", "limit"] },
    response: { fields: ["synced", "records", "usedFallback", "healthy"], successStatuses: [200] },
    errors: [
      { status: 400, reason: "Invalid source" },
      { status: 401, reason: "Unauthorized — missing or invalid JWT" },
    ],
  },
  "plaid-link-token": {
    methods: ["POST"],
    requestBody: { required: [], optional: ["user_id", "products", "country_codes", "language"] },
    response: {
      fields: ["link_token", "linkToken", "expiration", "annual_income", "confidence", "currency"],
      successStatuses: [200],
    },
    note: "Same handler also serves the income-verification flow (annual_income/confidence/currency)",
  },
  "create-booking-payment": {
    methods: ["POST"],
    requestBody: {
      required: ["listing_id", "guest_email", "amount", "nights"],
      optional: ["booking_request_id", "guest_name", "property_label", "origin"],
    },
    response: { fields: ["url"], successStatuses: [200] },
    errors: [
      { status: 400, reason: "Validation error (nights, email, listing)" },
      { status: 500, reason: "Stripe checkout creation failed" },
    ],
  },
  "create-concierge-payment": {
    methods: ["POST"],
    requestBody: {
      required: ["order_id", "service_id", "amount", "currency", "guest_email"],
      optional: ["guest_name", "service_title", "origin", "booking_slug"],
    },
    response: { fields: ["url"], successStatuses: [200] },
    errors: [{ status: 400, reason: "Validation error" }],
  },
  "get-turn-credentials": {
    methods: ["POST"],
    response: { fields: ["iceServers", "iceTransportPolicy", "ttlSeconds"], successStatuses: [200] },
    errors: [
      { status: 405, reason: "Method not allowed" },
      { status: 500, reason: "Internal error" },
    ],
  },
  "translate-message": {
    methods: ["POST"],
    requestBody: { required: ["text"], optional: ["from_locale", "to_locale", "detect_only"] },
    response: { fields: ["translated", "engine", "detected_locale"], successStatuses: [200] },
    errors: [
      { status: 400, reason: "Missing text or locales" },
    ],
  },
  "send-otp": {
    methods: ["POST"],
    requestBody: { required: [], optional: ["phone", "email", "channel", "probe"] },
    response: { fields: ["sent", "channel", "ok", "success", "error_code"], successStatuses: [200] },
    note: "probe=true is a health-check call without phone/email",
  },
  "process-refund": {
    methods: ["POST"],
    requestBody: {
      required: [],
      optional: ["booking_id", "booking_type", "orderId", "paymentIntentId", "reason"],
    },
    response: { fields: ["refund"], successStatuses: [200] },
    errors: [
      { status: 401, reason: "Unauthorized / authentication failed" },
      { status: 503, reason: "Payment system not configured" },
    ],
    note: "Accepts either booking_id+booking_type (admin path) or orderId+paymentIntentId (live connector)",
  },
  "send-notification-email": {
    methods: ["POST"],
    requestBody: {
      required: ["event_type"],
      optional: ["recipient_email", "to", "recipient_name", "data", "locale", "org_id", "test_mode"],
    },
    response: { fields: ["sent"], successStatuses: [200] },
    errors: [
      { status: 400, reason: "org_id is required" },
      { status: 401, reason: "Unauthorized" },
    ],
  },
  "send-push-notification": {
    methods: ["POST"],
    requestBody: {
      required: [],
      optional: ["userId", "user_id", "title", "body", "url", "data", "event_type"],
    },
    response: { fields: ["sent", "failed"], successStatuses: [200] },
    errors: [
      { status: 400, reason: "Bad payload" },
      { status: 503, reason: "Push backend unavailable" },
    ],
    note: "Handler accepts either userId or user_id",
  },
  "wallet-pin": {
    methods: ["POST"],
    requestBody: { required: ["action"], optional: ["pin", "current_pin", "new_pin"] },
    response: { fields: ["status"], successStatuses: [200] },
    errors: [
      { status: 400, reason: "Bad request" },
      { status: 401, reason: "Invalid PIN or unauthorized" },
    ],
  },
  "guest-session": {
    methods: ["POST"],
    requestBody: { required: ["action"], optional: ["session_id", "email", "phone", "context"] },
    response: { fields: ["session", "valid"], successStatuses: [200] },
    errors: [
      { status: 404, reason: "Session not found" },
      { status: 429, reason: "Too many sessions" },
    ],
  },
  "verify-otp": {
    methods: ["POST"],
    requestBody: { required: ["phone", "code"], optional: ["channel"] },
    response: { fields: ["session", "valid", "error_code"], successStatuses: [200] },
    errors: [
      { status: 400, reason: "Bad code" },
      { status: 401, reason: "Code expired or invalid" },
    ],
  },
};
