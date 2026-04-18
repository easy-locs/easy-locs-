/**
 * goal-create — creates a new system.goals row owned by the caller.
 *
 * Governance:
 *   1. Validates caller JWT.
 *   2. Asserts caller has the "admin" app_role (defence-in-depth alongside RLS).
 *   3. Inserts the goal via the user-scoped client so RLS applies.
 *   4. Optionally auto-runs the planner when { run_planner: true } is sent
 *      (planner itself enforces admin again).
 *
 * Returns: { goal: { id, title, status, priority, created_at }, planner?: {...} }
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

interface GoalCreateRequest {
  title: string;
  description?: string | null;
  priority?: number;
  run_planner?: boolean;
}

Deno.serve(async (req) => {
  const __qs = rejectQuerySecrets(req);
  if (__qs.rejected) return __qs.response!;
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const serviceClient = createClient(supabaseUrl, serviceKey);
  const { data: isAdmin } = await serviceClient
    .rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) {
    return new Response(
      JSON.stringify({ error: "Admin role required to create goals" }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  let body: GoalCreateRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const title = (body.title ?? "").trim();
  if (!title || title.length > 200) {
    return new Response(
      JSON.stringify({ error: "title is required (1–200 chars)" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  const priority = Math.min(5, Math.max(1, Number(body.priority ?? 3) | 0));
  const description = body.description?.toString().slice(0, 4000) ?? null;

  // Insert via user client so RLS WITH CHECK applies (defence-in-depth).
  const { data: goal, error: insertError } = await userClient
    .schema("system")
    .from("goals")
    .insert({
      title,
      description,
      priority,
      created_by: user.id,
      status: "active",
    })
    .select("id, title, description, status, priority, created_at")
    .single();

  if (insertError || !goal) {
    console.error("[goal-create] insert error:", insertError?.message);
    return new Response(
      JSON.stringify({ error: insertError?.message ?? "Insert failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  let planner: unknown = undefined;
  if (body.run_planner) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/goal-planner`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({ goal_id: goal.id }),
      });
      planner = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    } catch (e) {
      planner = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  return new Response(
    JSON.stringify({ goal, planner }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
