// agent-heal — placeholder stub.
//
// This endpoint was scaffolded under Task #998 (Hierarchical agent army) but
// its implementation was never committed (the file landed empty after a
// botched merge). The shared docs in `../_shared/army.ts` note that
// `agent-heal` MUST funnel through the same spawn primitive — that work is
// open and tracked separately.
//
// Until that work lands, this stub returns 501 instead of leaving an empty
// file that breaks `supabase functions deploy` and the bundle-gate validation
// pipeline.
import { getCorsHeaders, preflight } from "../_shared/cors.ts";

Deno.serve((req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  return new Response(
    JSON.stringify({ error: "not_implemented", function: "agent-heal" }),
    { status: 501, headers: { "Content-Type": "application/json", ...getCorsHeaders(req) } },
  );
});
