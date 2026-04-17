/**
 * vector-similarity-search — STUB.
 *
 * The frontend recommendation engine
 * (`src/engines/recommendations/recommendation-engine.ts`) optionally invokes
 * this function to fetch pgvector-similar items. The real implementation is
 * pending the consolidation effort tracked in task #226 (which folds
 * vector-* functions into a single router).
 *
 * Until then this stub satisfies the frontend ↔ edge contract by returning
 * an empty `matches` array. The caller already gracefully degrades when
 * `matches` is empty, so user-facing behaviour is unaffected.
 *
 * Discovered and stubbed by the contract-matrix audit (task #900).
 */
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  user_id?: string;
  query_embedding?: number[];
  match_count?: number;
  similarity_threshold?: number;
}

interface ResponseBody {
  matches: Array<{
    id: string;
    title: string;
    type: string;
    route: string;
    vertical: string;
    similarity: number;
    image_url?: string;
    subtitle?: string;
  }>;
  stub: true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = await requireAuthenticatedUser(req);
  if (!auth.authorized) return auth.response!;

  // Validate body shape so callers see contract errors early.
  const body = (await req.json().catch(() => ({}))) as RequestBody;
  if (!Array.isArray(body.query_embedding)) {
    return new Response(
      JSON.stringify({ error: "query_embedding (number[]) is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const payload: ResponseBody = { matches: [], stub: true };
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
