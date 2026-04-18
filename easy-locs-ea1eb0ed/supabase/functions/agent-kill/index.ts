// agent-kill — placeholder stub.
//
// This endpoint was scaffolded under Task #998 (Hierarchical agent army) but
// its implementation was never committed (the file landed empty after a
// botched merge). The global kill switch is enforced via
// `assertNotKilled` in `../_shared/army.ts` against `army.system_flags`;
// per-agent kill semantics will live here once that work lands.
//
// Until then, this stub returns 501 instead of leaving an empty file that
// breaks `supabase functions deploy` and the bundle-gate validation pipeline.
import { getCorsHeaders, preflight } from "../_shared/cors.ts";

Deno.serve((req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  return new Response(
    JSON.stringify({ error: "not_implemented", function: "agent-kill" }),
    { status: 501, headers: { "Content-Type": "application/json", ...getCorsHeaders(req) } },
  );
});
