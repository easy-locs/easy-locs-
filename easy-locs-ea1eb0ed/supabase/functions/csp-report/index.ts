import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { withRateLimit } from "../_shared/rate-limit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, x-client-info, apikey, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CspReport = {
  "csp-report"?: Record<string, unknown>;
};

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders });
  }

  let payload: CspReport | Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return new Response("invalid json", { status: 400, headers: corsHeaders });
  }

  const report = (payload as CspReport)["csp-report"] ?? payload;
  const ua = req.headers.get("user-agent") ?? null;
  const referer = req.headers.get("referer") ?? null;

  if (SUPABASE_URL && SERVICE_ROLE) {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    await admin.from("security_csp_reports").insert({
      report,
      user_agent: ua,
      referer,
      received_at: new Date().toISOString(),
    });
  }

  return new Response(null, { status: 204, headers: corsHeaders });
}

Deno.serve(withRateLimit("csp-report", handler, { maxRequests: 240, windowSeconds: 60 }));
