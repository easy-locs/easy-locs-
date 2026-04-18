const ALLOWED_ORIGINS = [
  Deno.env.get("SITE_URL"),
  Deno.env.get("STAGING_URL"),
  "https://easy-locs.com",
  "https://staging.easy-locs.com",
  "https://app.easy-locs.com",
].filter(Boolean) as string[];

export function getAllowedOrigin(req: Request): string {
  const origin = req.headers.get("Origin") ?? "";
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  return ALLOWED_ORIGINS[0] ?? "";
}

/**
 * Distributed-tracing headers injected by the frontend fetch wrapper
 * (`src/lib/observability/trace-context.ts`). Every edge function MUST
 * accept these in its CORS allow-list, otherwise the browser preflight
 * fails with `Request header field x-span-id is not allowed by
 * Access-Control-Allow-Headers in preflight response` and the real
 * request never fires (this killed the OTP login flow once already).
 *
 * This list is the single source of truth — `check-build-invariants.cjs`
 * scans every `supabase/functions/**\/index.ts` and fails the build if
 * any hardcoded `Access-Control-Allow-Headers` string omits one of
 * these names.
 */
export const TRACE_HEADER_NAMES = [
  "x-trace-id",
  "x-span-id",
  "x-parent-span-id",
  "x-request-id",
  "traceparent",
] as const;

const SUPABASE_CLIENT_HEADER_NAMES = [
  "authorization",
  "x-client-info",
  "apikey",
  "content-type",
  "x-supabase-client-platform",
  "x-supabase-client-platform-version",
  "x-supabase-client-runtime",
  "x-supabase-client-runtime-version",
] as const;

export const ALLOWED_HEADERS = [
  ...SUPABASE_CLIENT_HEADER_NAMES,
  ...TRACE_HEADER_NAMES,
].join(", ");

export function getCorsHeaders(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(req),
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
