import { createClient } from "npm:@supabase/supabase-js@2.57.2";
// LB1 Track 1 (#841) — AI parsing of inbound command emails goes through the
// platform agent registry via `parseEmailWithAI` (extracted to ./parser.ts).
// Direct `openaiChat` is no longer permitted on this surface.
import { parseEmailWithAI, type ParsedEmail } from "./parser.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import { withRateLimit } from "../_shared/with-rate-limit.ts";
import { verifyHmacSha256, constantTimeEqual } from "../_shared/webhook-signature.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-secret, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const COMMAND_EMAIL_SECRET = Deno.env.get("COMMAND_EMAIL_SECRET") || "";
const COMMAND_EMAIL_HMAC_SECRET = Deno.env.get("COMMAND_EMAIL_HMAC_SECRET") || "";
const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN") || "";
const GITHUB_REPO = Deno.env.get("GITHUB_REPO") || "";

async function createGithubIssue(parsed: ParsedEmail): Promise<{ number: number; url: string } | null> {
  if (!GITHUB_TOKEN || !GITHUB_REPO) return null;
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
      method: "POST",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: parsed.title,
        body: `## Task from Email\n\n${parsed.description}\n\n---\n**Pillar:** ${parsed.pillar}\n**Priority:** ${parsed.priority}\n**Type:** ${parsed.type}\n**Source:** Email intake`,
        labels: parsed.labels,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { number: data.number, url: data.html_url };
  } catch { return null; }
}

async function handler(req: Request): Promise<Response> {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  if (!COMMAND_EMAIL_SECRET && !COMMAND_EMAIL_HMAC_SECRET) {
    console.error("[command-email-intake] No webhook secret configured — rejecting request");
    return new Response(JSON.stringify({ error: "Webhook not configured" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Read the raw body once so we can verify the HMAC over the exact bytes
  // the sender signed, then still parse it as form-data or JSON below.
  const rawBody = await req.text();

  const signature = req.headers.get("x-webhook-signature");
  const providedSecret = req.headers.get("x-webhook-secret") ?? "";

  // Preferred path: HMAC-SHA-256 signature over the raw body.
  const hmacOk =
    !!COMMAND_EMAIL_HMAC_SECRET &&
    verifyHmacSha256(rawBody, signature, COMMAND_EMAIL_HMAC_SECRET);

  // Legacy path: shared-secret header, constant-time compared to avoid
  // timing oracles. Kept only while senders migrate to HMAC.
  const legacyOk =
    !!COMMAND_EMAIL_SECRET &&
    constantTimeEqual(providedSecret, COMMAND_EMAIL_SECRET);

  if (!hmacOk && !legacyOk) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    let fromEmail = "", subject = "", textBody = "";

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      // Rebuild a Request so we can call formData() on the already-consumed body.
      const fd = await new Request(req.url, { method: "POST", headers: req.headers, body: rawBody }).formData();
      fromEmail = fd.get("from")?.toString() || "";
      subject = fd.get("subject")?.toString() || "";
      textBody = fd.get("text")?.toString() || "";
    } else if (contentType.includes("application/json")) {
      const body = JSON.parse(rawBody || "{}");
      fromEmail = body.from || "";
      subject = body.subject || "";
      textBody = body.text || body.body || "";
    } else {
      return new Response(JSON.stringify({ error: "Unsupported content type" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const emailMatch = fromEmail.match(/<([^>]+)>/);
    fromEmail = (emailMatch ? emailMatch[1] : fromEmail).trim().toLowerCase();
    if (!fromEmail) {
      return new Response(JSON.stringify({ error: "No sender email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("[command-email-intake] Processing from:", fromEmail, "subject:", subject);

    const parsed = await parseEmailWithAI(subject, textBody);

    const { data: emailRecord, error: insertErr } = await supabase.from("command_emails").insert({
      from_email: fromEmail,
      subject,
      raw_body: textBody,
      parsed_title: parsed.title,
      parsed_description: parsed.description,
      parsed_pillar: parsed.pillar,
      parsed_priority: parsed.priority,
      parsed_type: parsed.type,
      status: "parsed",
    }).select().single();

    if (insertErr) {
      console.error("[command-email-intake] Insert failed:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to save" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ghIssue = await createGithubIssue(parsed);
    if (ghIssue) {
      await supabase.from("command_emails").update({
        github_issue_number: ghIssue.number,
        github_issue_url: ghIssue.url,
        status: "issue_created",
      }).eq("id", emailRecord.id);
    }

    await supabase.from("command_audit_log").insert({
      event_type: "email_intake",
      actor_type: "system",
      actor_name: "email-intake",
      action: `Processed email from ${fromEmail}: ${parsed.title}`,
      target_type: "command_email",
      target_id: emailRecord.id,
      details: { parsed, github_issue: ghIssue },
    });

    console.log("[command-email-intake] Done. GitHub issue:", ghIssue?.number || "skipped");

    return new Response(JSON.stringify({
      status: "ok",
      email_id: emailRecord.id,
      parsed,
      github_issue: ghIssue,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[command-email-intake] Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}

// IP + route rate limiting: the intake is public-facing (SES forwards to it
// without a JWT) so we gate it to a conservative burst before the signature
// check even runs on the request.
Deno.serve(withRateLimit("command-email-intake", handler, { maxRequests: 60, windowSeconds: 60 }));
