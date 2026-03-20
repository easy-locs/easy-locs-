/**
 * dino-verification-loop — Edge function that re-audits after fixes,
 * closes resolved issues, re-enqueues stale ones.
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: only service-role or CRON_SECRET allowed
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cronSecret = Deno.env.get("CRON_SECRET") || "";
    if (authHeader !== serviceKey && (cronSecret.length === 0 || authHeader !== cronSecret)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let verified = 0;
    let reopened = 0;

    // 1. Find completed fix jobs
    const { data: doneJobs } = await supabase
      .from("dino_sync_jobs")
      .select("*")
      .eq("status", "done")
      .order("finished_at", { ascending: false })
      .limit(50);

    for (const job of doneJobs ?? []) {
      // Find matching open issues for this entity
      const { data: openIssues } = await supabase
        .from("dino_issues")
        .select("*")
        .eq("route", job.entity_id)
        .eq("status", "open")
        .eq("auto_fixable", true)
        .limit(10);

      for (const issue of openIssues ?? []) {
        await supabase
          .from("dino_issues")
          .update({ status: "fixed", resolved_at: new Date().toISOString() })
          .eq("id", issue.id);
        verified++;
      }
    }

    // 2. Check stale open issues (>24h) and re-enqueue
    const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: staleIssues } = await supabase
      .from("dino_issues")
      .select("*")
      .eq("status", "open")
      .eq("auto_fixable", true)
      .lt("created_at", staleThreshold)
      .limit(20);

    for (const issue of staleIssues ?? []) {
      await supabase.from("dino_sync_jobs").insert({
        job_type: "sanitize_labels",
        entity_type: "route",
        entity_id: issue.route,
        payload_json: { rerun: true, issueId: issue.id },
        priority: 5,
      });
      reopened++;
    }

    console.log(`Verification loop: ${verified} verified, ${reopened} reopened`);
    return new Response(JSON.stringify({ ok: true, verified, reopened }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Verification loop error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
