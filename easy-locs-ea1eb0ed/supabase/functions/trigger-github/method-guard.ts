/**
 * trigger-github — method guard.
 *
 * Extracted so it can be unit-tested without booting Deno or pulling in the
 * npm: Supabase client that the handler imports. Pins the contract that
 * `trigger-github` only honours POST (real dispatch) and OPTIONS (CORS
 * preflight). Any other method short-circuits with 405 before we touch
 * auth, RPCs or the GitHub runner.
 */

export const TRIGGER_GITHUB_ALLOWED_METHODS = "POST, OPTIONS";

export function buildMethodNotAllowedResponse(
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({ error: "Method Not Allowed" }),
    {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        Allow: TRIGGER_GITHUB_ALLOWED_METHODS,
      },
    },
  );
}

export function isAllowedTriggerGithubMethod(method: string): boolean {
  return method === "POST" || method === "OPTIONS";
}
