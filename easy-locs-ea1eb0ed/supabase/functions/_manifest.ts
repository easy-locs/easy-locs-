/**
 * Explicit security manifest for edge functions.
 *
 * The inventory script (`scripts/security-inventory-edge-functions.ts`) uses
 * this as the ground-truth classification. Any function whose name does NOT
 * appear here is treated as "unclassified" and flagged in the inventory.
 *
 * Keep entries alphabetical per section. Every entry must state:
 *  - `auth`      how callers are authenticated (jwt, service_role, signature, token, public)
 *  - `rateLimit` whether the function wraps its handler with `withRateLimit`
 *  - `reason`    short justification, especially for `public` entries
 */

export type ManifestEntry = {
  auth: "jwt" | "service_role" | "signature" | "token" | "public";
  rateLimit: boolean;
  reason?: string;
};

export const EDGE_FUNCTION_MANIFEST: Record<string, ManifestEntry> = {
  // ── Public webhooks (third-party callers, no JWT) ────────────────────
  "stripe-webhook": { auth: "signature", rateLimit: false, reason: "Stripe sends ts+sig; verified with stripe.webhooks.constructEvent" },
  "ses-webhook": { auth: "signature", rateLimit: false, reason: "AWS SNS signature verification in handler" },
  "plaid-webhook": { auth: "signature", rateLimit: false, reason: "Plaid JWT signature" },
  "crypto-webhook": { auth: "signature", rateLimit: false, reason: "HMAC signature header" },
  "mobile-money-webhook": { auth: "signature", rateLimit: false, reason: "PSP HMAC signature" },
  "esign-webhook": { auth: "signature", rateLimit: false, reason: "eSign provider HMAC" },
  "dispatch-webhook": { auth: "signature", rateLimit: false, reason: "Dispatcher HMAC" },
  "command-github-webhook": { auth: "signature", rateLimit: false, reason: "GitHub X-Hub-Signature-256 HMAC SHA-256" },
  "command-email-intake": { auth: "signature", rateLimit: true, reason: "HMAC-SHA256 preferred (x-webhook-signature) or legacy shared secret (constant-time)" },
  "command-approval-webhook": { auth: "token", rateLimit: true, reason: "Per-request opaque tokens in the approval_requests table; JSON path uses constant-time shared secret" },
  "receive-email": { auth: "signature", rateLimit: true, reason: "SendGrid inbound shared secret, constant-time compare" },
  "inngest-handler": { auth: "signature", rateLimit: false, reason: "Inngest SDK verifies its own signing key" },

  // ── Cron dispatchers (called by pg_cron via pg_net) ──────────────────
  "autonomous-cron-dispatcher": { auth: "service_role", rateLimit: false, reason: "Invoked server-side via service-role header" },
  "prayer-push-cron": { auth: "service_role", rateLimit: false, reason: "pg_cron service-role invocation" },
  "command-monitoring-cron": { auth: "service_role", rateLimit: false, reason: "Internal secret header, constant-time compared" },

  // ── Public SEO / read APIs ───────────────────────────────────────────
  "public-api": { auth: "public", rateLimit: true, reason: "Read-only SEO / taxonomy endpoints; per-route RLS + rate limit" },
  "csp-report": { auth: "public", rateLimit: true, reason: "CSP report-uri collector; accepts application/csp-report from browsers, persists to security_csp_reports" },

  // ── Domain routers (JWT verified inside via edge-auth.ts) ────────────
  // rateLimit is currently false for routers: they do auth via edge-auth
  // but do not wrap with `withRateLimit`. Tracked in follow-up #772.
  "admin-router": { auth: "jwt", rateLimit: false, reason: "JWT verified inside router; rate-limit wrapper pending (follow-up #772)" },
  "ai-router": { auth: "jwt", rateLimit: false, reason: "JWT verified inside router; rate-limit wrapper pending" },
  "vector-similarity-search": { auth: "jwt", rateLimit: false, reason: "JWT verified via requireAuthenticatedUser; rate-limit wrapper pending follow-up #772" },
  "ai-proxy": { auth: "jwt", rateLimit: false, reason: "JWT verified inside proxy; rate-limit wrapper pending" },
  "booking-router": { auth: "jwt", rateLimit: false, reason: "JWT verified inside router; rate-limit wrapper pending" },
  "commerce-router": { auth: "jwt", rateLimit: false, reason: "JWT verified inside router; rate-limit wrapper pending" },
  "food-router": { auth: "jwt", rateLimit: false, reason: "JWT verified inside router; rate-limit wrapper pending" },
  "gdpr-router": { auth: "jwt", rateLimit: false, reason: "JWT verified inside router; rate-limit wrapper pending" },
  "identity-router": { auth: "jwt", rateLimit: false, reason: "JWT verified inside router; rate-limit wrapper pending" },
  "infra-router": { auth: "jwt", rateLimit: false, reason: "JWT verified inside router; rate-limit wrapper pending" },
  "logistics-router": { auth: "jwt", rateLimit: false, reason: "JWT verified inside router; rate-limit wrapper pending" },
  "marketplace-router": { auth: "jwt", rateLimit: false, reason: "JWT verified inside router; rate-limit wrapper pending" },
  "media-router": { auth: "jwt", rateLimit: false, reason: "JWT verified inside router; rate-limit wrapper pending" },
  "notification-router": { auth: "jwt", rateLimit: false, reason: "JWT verified inside router; rate-limit wrapper pending" },
  "orbit-router": { auth: "jwt", rateLimit: false, reason: "JWT verified inside router; rate-limit wrapper pending" },
  "rent-router": { auth: "jwt", rateLimit: false, reason: "JWT verified inside router; rate-limit wrapper pending" },
  "search-router": { auth: "jwt", rateLimit: false, reason: "JWT verified inside router; rate-limit wrapper pending" },
  "stripe-router": { auth: "jwt", rateLimit: false, reason: "JWT verified inside router; rate-limit wrapper pending" },
  "system-router": { auth: "jwt", rateLimit: false, reason: "JWT verified inside router; rate-limit wrapper pending" },
  "voice-router": { auth: "jwt", rateLimit: false, reason: "JWT verified inside router; rate-limit wrapper pending" },
  "wallet-router": { auth: "jwt", rateLimit: false, reason: "JWT verified inside router; rate-limit wrapper pending" },
  "webauthn-router": { auth: "jwt", rateLimit: false, reason: "JWT verified inside router; rate-limit wrapper pending" },
};
