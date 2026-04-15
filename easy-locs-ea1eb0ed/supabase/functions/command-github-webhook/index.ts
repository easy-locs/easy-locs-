import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { createHmac } from "node:crypto";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GITHUB_WEBHOOK_SECRET = Deno.env.get("GITHUB_WEBHOOK_SECRET") || "";
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY") || "";
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") || "";
const AGENT_PREFIX = "agent/";

function verifyGithubSignature(payload: string, signature: string): boolean {
  if (!GITHUB_WEBHOOK_SECRET || !signature) return false;
  const hmac = createHmac("sha256", GITHUB_WEBHOOK_SECRET);
  hmac.update(payload);
  const expected = `sha256=${hmac.digest("hex")}`;
  return signature === expected;
}

function isAgentPR(pr: { head?: { ref?: string }; user?: { login?: string }; labels?: Array<{ name: string }> }): boolean {
  const branchName = pr.head?.ref || "";
  if (branchName.startsWith(AGENT_PREFIX)) return true;

  const login = pr.user?.login || "";
  const agentBotNames = ["github-actions[bot]", "dependabot[bot]"];
  if (agentBotNames.includes(login)) return true;

  const labels = pr.labels?.map((l) => l.name) || [];
  if (labels.includes("agent-created") || labels.includes("auto-generated")) return true;

  return false;
}

function assessRisk(pr: { additions?: number; deletions?: number; changed_files?: number; title?: string }): string {
  const additions = pr.additions || 0;
  const deletions = pr.deletions || 0;
  const changedFiles = pr.changed_files || 0;
  const title = (pr.title || "").toLowerCase();

  if (title.includes("migration") || title.includes("schema") || additions + deletions > 500 || changedFiles > 20) return "high";
  if (additions + deletions > 200 || changedFiles > 10) return "medium";
  return "low";
}

async function sendApprovalEmail(params: {
  pr_number: number;
  pr_title: string;
  approval_token: string;
  risk_assessment: string;
  pr_url: string;
  agent_name: string;
  preview_url: string | null;
  diff_summary: string;
}): Promise<boolean> {
  if (!SENDGRID_API_KEY || !OWNER_EMAIL) return false;

  const approveUrl = `${SUPABASE_URL}/functions/v1/command-approval-webhook?token=${params.approval_token}&intent=approve`;
  const rejectUrl = `${SUPABASE_URL}/functions/v1/command-approval-webhook?token=${params.approval_token}&intent=reject`;

  const riskColors: Record<string, string> = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444", critical: "#dc2626" };
  const riskColor = riskColors[params.risk_assessment] || "#6b7280";

  const escapedDiff = params.diff_summary.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9fafb;">
<div style="background:white;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <h2 style="margin:0 0 16px;color:#111827;">Agent PR Ready for Review</h2>
  <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin-bottom:16px;">
    <p style="margin:0 0 8px;font-weight:600;font-size:16px;">#${params.pr_number}: ${params.pr_title}</p>
    <p style="margin:0 0 4px;color:#6b7280;font-size:14px;">Agent: ${params.agent_name}</p>
    <p style="margin:0;font-size:14px;">Risk: <span style="color:${riskColor};font-weight:600;">${params.risk_assessment.toUpperCase()}</span></p>
  </div>
  <div style="margin-bottom:16px;">
    <h3 style="margin:0 0 8px;font-size:14px;">Diff Summary</h3>
    <pre style="background:#f9fafb;padding:12px;border-radius:6px;font-size:13px;white-space:pre-wrap;overflow-x:auto;">${escapedDiff}</pre>
  </div>
  ${params.preview_url ? `<p style="margin-bottom:16px;"><a href="${params.preview_url}" style="color:#2563eb;">View Preview Deployment</a> | <a href="${params.pr_url}" style="color:#2563eb;">View PR on GitHub</a></p>` : `<p style="margin-bottom:16px;"><a href="${params.pr_url}" style="color:#2563eb;">View PR on GitHub</a></p>`}
  <div style="margin-top:20px;">
    <a href="${approveUrl}" style="display:inline-block;background:#22c55e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-right:12px;">Approve & Merge</a>
    <a href="${rejectUrl}" style="display:inline-block;background:#ef4444;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Reject</a>
  </div>
  <p style="margin-top:12px;font-size:12px;color:#9ca3af;">You will be asked to confirm your decision on the next page.</p>
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
        subject: `[Agent PR] #${params.pr_number}: ${params.pr_title} (${params.risk_assessment.toUpperCase()} risk)`,
        content: [{ type: "text/html", value: html }],
      }),
    });
    return res.ok || res.status === 202;
  } catch { return false; }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), { status: 405 });
  }

  if (!GITHUB_WEBHOOK_SECRET) {
    console.error("[github-webhook] GITHUB_WEBHOOK_SECRET not configured — rejecting request");
    return new Response(JSON.stringify({ error: "Webhook not configured" }), { status: 503 });
  }

  const rawBody = await req.text();

  const signature = req.headers.get("x-hub-signature-256") || "";
  if (!verifyGithubSignature(rawBody, signature)) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
  }

  const event = req.headers.get("x-github-event");
  if (event !== "pull_request") {
    return new Response(JSON.stringify({ status: "ignored", event }), { status: 200 });
  }

  let payload;
  try { payload = JSON.parse(rawBody); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const action = payload.action;
  if (!["opened", "ready_for_review"].includes(action)) {
    return new Response(JSON.stringify({ status: "ignored", action }), { status: 200 });
  }

  const pr = payload.pull_request;
  if (!pr || pr.draft) {
    return new Response(JSON.stringify({ status: "ignored", reason: "draft or missing PR" }), { status: 200 });
  }

  if (!isAgentPR(pr)) {
    return new Response(JSON.stringify({ status: "ignored", reason: "not an agent PR" }), { status: 200 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const risk = assessRisk(pr);
  const agentName = pr.user?.login || pr.head?.ref?.replace(AGENT_PREFIX, "") || "unknown-agent";

  let diffSummary = `+${pr.additions || 0} -${pr.deletions || 0} lines across ${pr.changed_files || 0} files`;
  if (GITHUB_TOKEN && GITHUB_REPO) {
    try {
      const diffRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/pulls/${pr.number}/files?per_page=30`, {
        headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" },
      });
      if (diffRes.ok) {
        const files = await diffRes.json();
        const fileLines = files.map((f: { filename: string; additions: number; deletions: number; status: string }) =>
          `  ${f.status === "added" ? "+" : f.status === "removed" ? "-" : "~"} ${f.filename} (+${f.additions}/-${f.deletions})`
        ).join("\n");
        diffSummary = `+${pr.additions || 0} -${pr.deletions || 0} lines across ${pr.changed_files || 0} files\n\nFiles changed:\n${fileLines}`;
      }
    } catch { /* fallback to basic summary */ }
  }

  let previewUrl: string | null = null;
  const deploymentStatuses = pr.statuses_url || null;
  if (GITHUB_TOKEN && GITHUB_REPO && pr.head?.sha) {
    try {
      const statusRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/commits/${pr.head.sha}/statuses?per_page=10`, {
        headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" },
      });
      if (statusRes.ok) {
        const statuses = await statusRes.json();
        const vercelStatus = statuses.find((s: { context: string; target_url: string }) =>
          s.context && (s.context.includes("vercel") || s.context.includes("deploy")) && s.target_url
        );
        if (vercelStatus) previewUrl = vercelStatus.target_url;
      }
    } catch { /* no preview available */ }
  }

  const { data: existing } = await supabase.from("approval_requests")
    .select("id").eq("pr_number", pr.number).eq("status", "pending").single();

  if (existing) {
    return new Response(JSON.stringify({ status: "already_exists", approval_id: existing.id }), { status: 200 });
  }

  const { data: approval, error: insertErr } = await supabase.from("approval_requests").insert({
    pr_number: pr.number,
    pr_title: pr.title,
    pr_url: pr.html_url,
    preview_url: previewUrl,
    diff_summary: diffSummary,
    risk_assessment: risk,
    agent_name: agentName,
    reviewer_email: OWNER_EMAIL || null,
  }).select().single();

  if (insertErr || !approval) {
    console.error("[github-webhook] Failed to create approval:", insertErr?.message);
    return new Response(JSON.stringify({ error: "Failed to create approval" }), { status: 500 });
  }

  const emailSent = await sendApprovalEmail({
    pr_number: pr.number,
    pr_title: pr.title,
    approval_token: approval.approval_token,
    risk_assessment: risk,
    pr_url: pr.html_url,
    agent_name: agentName,
    preview_url: previewUrl,
    diff_summary: diffSummary,
  });

  if (emailSent) {
    await supabase.from("approval_requests").update({
      notification_sent_at: new Date().toISOString(),
    }).eq("id", approval.id);
  }

  await supabase.from("command_audit_log").insert({
    event_type: "agent_pr_detected",
    actor_type: "webhook",
    actor_name: "github-webhook",
    action: `Agent PR #${pr.number} detected: ${pr.title}`,
    target_type: "pull_request",
    target_id: String(pr.number),
    details: {
      agent_name: agentName,
      risk_assessment: risk,
      pr_url: pr.html_url,
      action: action,
      email_sent: emailSent,
      additions: pr.additions,
      deletions: pr.deletions,
      changed_files: pr.changed_files,
    },
  });

  return new Response(JSON.stringify({
    status: "ok",
    approval_id: approval.id,
    email_sent: emailSent,
    risk_assessment: risk,
  }), { status: 200, headers: { "Content-Type": "application/json" } });
});
