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

export function getCorsHeaders(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(req),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
