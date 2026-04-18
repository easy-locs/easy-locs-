import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import { withRateLimit } from "../_shared/with-rate-limit.ts";
import { constantTimeEqual } from "../_shared/webhook-signature.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN") || "";
const GITHUB_REPO = Deno.env.get("GITHUB_REPO") || "";
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY") || "";
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") || "";
const INTERNAL_SECRET = Deno.env.get("INTERNAL_NOTIFICATION_SECRET") || "";
const VERCEL_TOKEN = Deno.env.get("VERCEL_TOKEN") || "";
const VERCEL_PROJECT_ID = Deno.env.get("VERCEL_PROJECT_ID") || "";
const VERCEL_TEAM_ID = Deno.env.get("VERCEL_ORG_ID") || "";

const APPROVAL_TOKEN_TTL_HOURS = 72;

async function triggerVercelProductionDeploy(): Promise<{ id: string; url: string } | null> {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) return null;
  try {
    const queryParams = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";
    const res = await fetch(`https://api.vercel.com/v13/deployments${queryParams}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: VERCEL_PROJECT_ID, target: "production", project: VERCEL_PROJECT_ID }),
    });
    if (!res.ok) { console.error("[approval] Vercel deploy failed:", res.status); return null; }
    const data = await res.json();
    return { id: data.id, url: data.url };
  } catch (err) { console.error("[approval] Vercel deploy error:", err); return null; }
}

async function createGitTag(sha: string, tagName: string, message: string): Promise<string | null> {
  if (!GITHUB_TOKEN || !GITHUB_REPO || !sha) return null;
  try {
    const tagObj = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/git/tags`, {
      method: "POST",
      headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json", "Content-Type": "application/json" },
      body: JSON.stringify({ tag: tagName, message, object: sha, type: "commit", tagger: { name: "Easy-Locs C&C", email: "agents@easy-locs.com", date: new Date().toISOString() } }),
    });
    if (!tagObj.ok) return null;
    const tagData = await tagObj.json();

    const refRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/git/refs`, {
      method: "POST",
      headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json", "Content-Type": "application/json" },
      body: JSON.stringify({ ref: `refs/tags/${tagName}`, sha: tagData.sha }),
    });
    if (!refRes.ok) return null;
    return tagName;
  } catch { return null; }
}

async function mergeGithubPR(prNumber: number): Promise<{ merged: boolean; sha: string | null }> {
  if (!GITHUB_TOKEN || !GITHUB_REPO) return { merged: false, sha: null };
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/pulls/${prNumber}/merge`, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ merge_method: "squash" }),
    });
    if (!res.ok) return { merged: false, sha: null };
    const data = await res.json();
    return { merged: true, sha: data.sha || null };
  } catch { return { merged: false, sha: null }; }
}

async function closeGithubPR(prNumber: number, feedback: string): Promise<boolean> {
  if (!GITHUB_TOKEN || !GITHUB_REPO) return false;
  try {
    await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues/${prNumber}/comments`, {
      method: "POST",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body: `**PR Rejected**\n\nFeedback: ${feedback}\n\nPlease address the requested changes and resubmit.` }),
    });

    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/pulls/${prNumber}`, {
      method: "PATCH",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ state: "closed" }),
    });
    return res.ok;
  } catch { return false; }
}

async function sendApprovalNotification(params: {
  pr_number: number;
  pr_title: string;
  pr_url: string;
  preview_url: string | null;
  diff_summary: string | null;
  risk_assessment: string;
  agent_name: string | null;
  approval_token: string;
  base_url: string;
}): Promise<boolean> {
  if (!SENDGRID_API_KEY || !OWNER_EMAIL) return false;

  const approveUrl = `${params.base_url}/functions/v1/command-approval-webhook?token=${params.approval_token}&intent=approve`;
  const rejectUrl = `${params.base_url}/functions/v1/command-approval-webhook?token=${params.approval_token}&intent=reject`;

  const riskColors: Record<string, string> = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444", critical: "#dc2626" };
  const riskColor = riskColors[params.risk_assessment] || "#6b7280";

  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9fafb;">
<div style="background:white;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <h2 style="margin:0 0 16px;color:#111827;">PR Review Required</h2>
  <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin-bottom:16px;">
    <p style="margin:0 0 8px;font-weight:600;font-size:16px;">#${params.pr_number}: ${params.pr_title}</p>
    ${params.agent_name ? `<p style="margin:0 0 4px;color:#6b7280;font-size:14px;">Agent: ${params.agent_name}</p>` : ""}
    <p style="margin:0;font-size:14px;">Risk: <span style="color:${riskColor};font-weight:600;">${params.risk_assessment.toUpperCase()}</span></p>
  </div>
  ${params.diff_summary ? `<div style="margin-bottom:16px;"><h3 style="margin:0 0 8px;font-size:14px;">Diff Summary</h3><pre style="background:#f9fafb;padding:12px;border-radius:6px;font-size:13px;white-space:pre-wrap;">${params.diff_summary}</pre></div>` : ""}
  ${params.preview_url ? `<p style="margin-bottom:16px;"><a href="${params.preview_url}" style="color:#2563eb;">View Preview</a> | <a href="${params.pr_url}" style="color:#2563eb;">View PR</a></p>` : `<p style="margin-bottom:16px;"><a href="${params.pr_url}" style="color:#2563eb;">View PR on GitHub</a></p>`}
  <div style="margin-top:20px;">
    <a href="${approveUrl}" style="display:inline-block;background:#22c55e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-right:12px;">Approve & Merge</a>
    <a href="${rejectUrl}" style="display:inline-block;background:#ef4444;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Reject</a>
  </div>
  <p style="margin-top:12px;font-size:12px;color:#9ca3af;">You will be asked to confirm your decision before any action is taken.</p>
</div>
<p style="text-align:center;margin-top:16px;color:#9ca3af;font-size:12px;">Easy-Locs Command & Control</p>
</body></html>`;

  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: OWNER_EMAIL }] }],
        from: { email: "agents@easy-locs.com", name: "Easy-Locs Agents" },
        subject: `[PR Review] #${params.pr_number}: ${params.pr_title} (${params.risk_assessment.toUpperCase()} risk)`,
        content: [{ type: "text/html", value: html }],
      }),
    });
    return res.ok || res.status === 202;
  } catch { return false; }
}

function isTokenExpired(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return (now - created) > APPROVAL_TOKEN_TTL_HOURS * 60 * 60 * 1000;
}

function renderConfirmationPage(approval: { pr_number: number; pr_title: string; risk_assessment: string }, token: string, intent?: string): string {
  const riskColors: Record<string, string> = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444", critical: "#dc2626" };
  const riskColor = riskColors[approval.risk_assessment] || "#6b7280";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PR Approval - Easy-Locs</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:40px auto;padding:20px;background:#f9fafb;color:#111827}
  .card{background:white;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
  h1{font-size:20px;margin:0 0 16px}
  .info{background:#f3f4f6;border-radius:8px;padding:16px;margin-bottom:20px}
  .btn{display:inline-block;padding:12px 28px;border-radius:8px;border:none;font-weight:600;font-size:15px;cursor:pointer;color:white;margin-right:12px}
  .btn-approve{background:#22c55e}.btn-reject{background:#ef4444}
  .btn:hover{opacity:0.9}
  textarea{width:100%;box-sizing:border-box;padding:10px;border:1px solid #d1d5db;border-radius:6px;font-family:inherit;font-size:14px;resize:vertical;margin-bottom:16px}
  .footer{text-align:center;margin-top:20px;color:#9ca3af;font-size:12px}
</style></head><body>
<div class="card">
  <h1>Confirm Your Decision</h1>
  <div class="info">
    <p style="margin:0 0 8px;font-weight:600">#${approval.pr_number}: ${approval.pr_title}</p>
    <p style="margin:0">Risk: <span style="color:${riskColor};font-weight:600">${approval.risk_assessment.toUpperCase()}</span></p>
  </div>
  <form method="POST" id="approvalForm">
    <input type="hidden" name="token" value="${token}">
    ${intent === "reject" ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;margin-bottom:16px"><p style="margin:0;color:#991b1b;font-size:14px;font-weight:500">You selected <strong>Reject</strong>. Please provide feedback below and confirm.</p></div>` : ""}
    ${intent === "approve" ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin-bottom:16px"><p style="margin:0;color:#166534;font-size:14px;font-weight:500">You selected <strong>Approve & Merge</strong>. Please confirm below.</p></div>` : ""}
    <label style="font-size:14px;font-weight:500;display:block;margin-bottom:6px">Feedback (optional for approve, recommended for reject):</label>
    <textarea name="feedback" rows="3" placeholder="Any notes or requested changes..."></textarea>
    <div>
      <button type="submit" name="action" value="approve" class="btn btn-approve" onclick="return confirm('Approve and merge PR #${approval.pr_number}?')">Approve & Merge</button>
      <button type="submit" name="action" value="reject" class="btn btn-reject" onclick="return confirm('Reject PR #${approval.pr_number}?')">Reject</button>
    </div>
  </form>
</div>
<p class="footer">Easy-Locs Command & Control — This action cannot be undone.</p>
</body></html>`;
}

async function handler(req: Request): Promise<Response> {
  const __qsCheck = rejectQuerySecrets(req, { allowedParams: ["token", "intent"], corsHeaders: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } }); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  if (req.method === "GET") {
    const token = url.searchParams.get("token");
    if (!token) {
      return new Response(`<html><body style="font-family:sans-serif;text-align:center;padding:60px;">
        <h1 style="color:#ef4444;">Invalid Request</h1>
        <p>No token provided.</p></body></html>`,
        { status: 400, headers: { ...corsHeaders, "Content-Type": "text/html" } });
    }

    const { data: approval, error } = await supabase.from("approval_requests")
      .select("*").eq("approval_token", token).eq("status", "pending").single();

    if (error || !approval || isTokenExpired(approval.created_at)) {
      if (approval && isTokenExpired(approval.created_at)) {
        await supabase.from("approval_requests").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", approval.id);
      }
      return new Response(`<html><body style="font-family:sans-serif;text-align:center;padding:60px;">
        <h1 style="color:#ef4444;">Invalid or Expired</h1>
        <p>This approval link is no longer valid.</p></body></html>`,
        { status: 400, headers: { ...corsHeaders, "Content-Type": "text/html" } });
    }

    const intent = url.searchParams.get("intent") || undefined;
    return new Response(renderConfirmationPage(approval, token, intent), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }

  if (req.method === "POST") {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const token = formData.get("token") as string;
      const action = formData.get("action") as string;
      const feedback = (formData.get("feedback") as string) || "";

      if (!token || !action || !["approve", "reject"].includes(action)) {
        return new Response(`<html><body style="font-family:sans-serif;text-align:center;padding:60px;">
          <h1 style="color:#ef4444;">Invalid Request</h1></body></html>`,
          { status: 400, headers: { ...corsHeaders, "Content-Type": "text/html" } });
      }

      const { data: approval, error } = await supabase.from("approval_requests")
        .select("*").eq("approval_token", token).eq("status", "pending").single();

      if (error || !approval || isTokenExpired(approval.created_at)) {
        if (approval && isTokenExpired(approval.created_at)) {
          await supabase.from("approval_requests").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", approval.id);
        }
        return new Response(`<html><body style="font-family:sans-serif;text-align:center;padding:60px;">
          <h1 style="color:#ef4444;">Invalid or Expired</h1>
          <p>This approval link is no longer valid or has already been actioned.</p></body></html>`,
          { status: 400, headers: { ...corsHeaders, "Content-Type": "text/html" } });
      }

      if (action === "approve") {
        const mergeResult = await mergeGithubPR(approval.pr_number);

        let vercelDeploy: { id: string; url: string } | null = null;
        let gitTag: string | null = null;

        if (mergeResult.merged) {
          await supabase.from("approval_requests").update({
            status: "approved", approved_at: new Date().toISOString(),
            reviewer_feedback: feedback || null, updated_at: new Date().toISOString(),
          }).eq("id", approval.id);

          vercelDeploy = await triggerVercelProductionDeploy();

          const tagName = `rollback/pr-${approval.pr_number}-${Date.now()}`;
          gitTag = mergeResult.sha
            ? await createGitTag(mergeResult.sha, tagName, `Rollback point for PR #${approval.pr_number}: ${approval.pr_title}`)
            : null;

          await supabase.from("rollback_points").insert({
            change_type: "pr_merge", change_id: String(approval.pr_number),
            deployment_id: vercelDeploy?.id || null,
            git_commit_sha: mergeResult.sha || null,
            git_tag: gitTag || null,
            description: `Merged PR #${approval.pr_number}: ${approval.pr_title} | risk:${approval.risk_assessment} | agent:${approval.agent_name || "unknown"} | vercel:${vercelDeploy?.url || "n/a"}`,
          });
        } else {
          await supabase.from("approval_requests").update({
            status: "merge_failed", reviewer_feedback: feedback || null, updated_at: new Date().toISOString(),
          }).eq("id", approval.id);
        }

        await supabase.from("command_audit_log").insert({
          event_type: mergeResult.merged ? "pr_approved" : "pr_merge_failed", actor_type: "human",
          action: mergeResult.merged ? `Approved and merged PR #${approval.pr_number}: ${approval.pr_title}` : `Approved PR #${approval.pr_number} but merge failed`,
          target_type: "pull_request", target_id: String(approval.pr_number),
          details: { merged: mergeResult.merged, merge_sha: mergeResult.sha, risk: approval.risk_assessment, vercel_deploy: vercelDeploy, feedback },
        });

        if (mergeResult.merged) {
          const deployMsg = vercelDeploy ? ` and deployed to production` : "";
          return new Response(`<html><body style="font-family:sans-serif;text-align:center;padding:60px;">
            <h1 style="color:#22c55e;">Approved &amp; Merged</h1>
            <p>PR #${approval.pr_number} has been merged${deployMsg}.</p>
            <p>${approval.pr_title}</p></body></html>`,
            { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } });
        } else {
          return new Response(`<html><body style="font-family:sans-serif;text-align:center;padding:60px;">
            <h1 style="color:#f59e0b;">Merge Failed</h1>
            <p>PR #${approval.pr_number} was approved but could not be merged automatically. Please merge manually on GitHub.</p>
            <p>${approval.pr_title}</p></body></html>`,
            { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } });
        }
      }

      if (action === "reject") {
        await supabase.from("approval_requests").update({
          status: "rejected", rejected_at: new Date().toISOString(),
          reviewer_feedback: feedback || "Changes requested", updated_at: new Date().toISOString(),
        }).eq("id", approval.id);

        await closeGithubPR(approval.pr_number, feedback || "Changes requested");

        await supabase.from("command_audit_log").insert({
          event_type: "pr_rejected", actor_type: "human",
          action: `Rejected PR #${approval.pr_number}: ${approval.pr_title}`,
          target_type: "pull_request", target_id: String(approval.pr_number),
          details: { feedback, risk: approval.risk_assessment },
        });

        return new Response(`<html><body style="font-family:sans-serif;text-align:center;padding:60px;">
          <h1 style="color:#ef4444;">Rejected</h1>
          <p>PR #${approval.pr_number} has been rejected.</p>
          <p>${approval.pr_title}</p></body></html>`,
          { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } });
      }
    }

    if (contentType.includes("application/json")) {
      if (!INTERNAL_SECRET) {
        return new Response(JSON.stringify({ error: "Server not configured" }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const authHeader = req.headers.get("x-internal-secret") || "";
      if (!constantTimeEqual(authHeader, INTERNAL_SECRET)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const body = await req.json();
        const { pr_number, pr_title, pr_url, preview_url, diff_summary, risk_assessment, agent_name } = body;

        if (!pr_number || !pr_title) {
          return new Response(JSON.stringify({ error: "pr_number and pr_title required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: approval, error: insertErr } = await supabase.from("approval_requests").insert({
          pr_number, pr_title, pr_url: pr_url || "",
          preview_url: preview_url || null,
          diff_summary: diff_summary || null,
          risk_assessment: risk_assessment || "low",
          agent_name: agent_name || null,
          reviewer_email: OWNER_EMAIL || null,
        }).select().single();

        if (insertErr) {
          return new Response(JSON.stringify({ error: "Failed to create approval" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const emailSent = await sendApprovalNotification({
          ...approval,
          base_url: SUPABASE_URL,
        });

        if (emailSent) {
          await supabase.from("approval_requests").update({
            notification_sent_at: new Date().toISOString(),
          }).eq("id", approval.id);
        }

        await supabase.from("command_audit_log").insert({
          event_type: "approval_request_created", actor_type: "agent", actor_name: agent_name || "unknown",
          action: `Created approval request for PR #${pr_number}`,
          target_type: "pull_request", target_id: String(pr_number),
          details: { pr_title, risk: risk_assessment, email_sent: emailSent },
        });

        return new Response(JSON.stringify({
          status: "ok", approval_id: approval.id, email_sent: emailSent,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (err) {
        return new Response(JSON.stringify({ error: (err as Error).message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  }

  return new Response(JSON.stringify({ error: "Invalid request" }), {
    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Approval links are one-shot per token, but the endpoint itself is public
// (it serves both the confirmation UI and accepts signed approval POSTs).
// Rate-limit aggressively to stop brute-force of the 32-byte token space.
Deno.serve(withRateLimit("command-approval-webhook", handler, { maxRequests: 120, windowSeconds: 60 }));
