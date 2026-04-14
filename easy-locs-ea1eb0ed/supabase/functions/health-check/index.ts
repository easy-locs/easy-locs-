import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const start = Date.now();
  const checks: Array<{ name: string; status: string; ms: number }> = [];

  // 1. Database connectivity
  try {
    const t = Date.now();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    const { error } = await supabase.from("orgs").select("id").limit(1);
    checks.push({ name: "database", status: error ? "error" : "ok", ms: Date.now() - t });
  } catch {
    checks.push({ name: "database", status: "error", ms: 0 });
  }

  // 2. Storage accessibility
  try {
    const t = Date.now();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    const { error } = await supabase.storage.listBuckets();
    checks.push({ name: "storage", status: error ? "error" : "ok", ms: Date.now() - t });
  } catch {
    checks.push({ name: "storage", status: "error", ms: 0 });
  }

  // 3. Stripe key configured
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  checks.push({ name: "stripe_config", status: stripeKey ? "ok" : "warning", ms: 0 });

  // 4. Environment
  checks.push({
    name: "environment",
    status: Deno.env.get("SUPABASE_URL") ? "ok" : "error",
    ms: 0,
  });

  // 5. Job queue health
  try {
    const t = Date.now();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    const { count, error } = await supabase
      .from("job_queue")
      .select("id", { count: "exact", head: true })
      .in("status", ["failed", "dead"]);
    const failedCount = count ?? 0;
    checks.push({
      name: "job_queue",
      status: error ? "error" : failedCount > 10 ? "warning" : "ok",
      ms: Date.now() - t,
    });
  } catch {
    checks.push({ name: "job_queue", status: "warning", ms: 0 });
  }

  // 6. Cron monitoring health
  try {
    const t = Date.now();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    const cutoff = new Date(Date.now() - 86_400_000).toISOString();
    const { count, error } = await supabase
      .from("cron_execution_log")
      .select("id", { count: "exact", head: true })
      .eq("status", "failure")
      .gte("started_at", cutoff);
    const failedCrons = count ?? 0;
    checks.push({
      name: "cron_health",
      status: error ? "warning" : failedCrons > 5 ? "warning" : "ok",
      ms: Date.now() - t,
    });
  } catch {
    checks.push({ name: "cron_health", status: "warning", ms: 0 });
  }

  const hasError = checks.some(c => c.status === "error");
  const hasWarning = checks.some(c => c.status === "warning");

  return new Response(JSON.stringify({
    status: hasError ? "unhealthy" : hasWarning ? "degraded" : "healthy",
    checks,
    timestamp: new Date().toISOString(),
    totalMs: Date.now() - start,
    version: "2.0.0",
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: hasError ? 503 : 200,
  });
});
