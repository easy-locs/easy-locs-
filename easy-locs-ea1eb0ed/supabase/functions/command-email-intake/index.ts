import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { openaiChat } from "../_shared/openai-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const COMMAND_EMAIL_SECRET = Deno.env.get("COMMAND_EMAIL_SECRET") || "";
const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN") || "";
const GITHUB_REPO = Deno.env.get("GITHUB_REPO") || "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

interface ParsedEmail {
  title: string;
  description: string;
  pillar: string;
  priority: string;
  type: string;
  labels: string[];
}

const PILLAR_KEYWORDS: Record<string, string[]> = {
  dashboard: ["dashboard", "home", "overview", "stats"],
  radar: ["radar", "discovery", "search", "browse"],
  orbit: ["orbit", "chat", "message", "communication"],
  wallet: ["wallet", "payment", "transaction", "stripe"],
  marketplace: ["marketplace", "listing", "booking", "service"],
  property: ["property", "lease", "tenant", "rent", "maintenance"],
  infrastructure: ["infra", "database", "supabase", "deploy", "api"],
};

const PRIORITY_KEYWORDS: Record<string, string[]> = {
  critical: ["urgent", "critical", "emergency", "broken", "down", "crash"],
  high: ["important", "high priority", "asap", "blocker"],
  medium: ["medium", "normal", "standard"],
  low: ["low priority", "nice to have", "minor"],
};

const TYPE_KEYWORDS: Record<string, string[]> = {
  bug: ["bug", "error", "broken", "fix", "crash", "fail", "regression"],
  feature: ["feature", "add", "new", "implement", "create", "build"],
  refactor: ["refactor", "clean", "restructure", "optimize"],
  docs: ["docs", "documentation", "readme"],
  test: ["test", "testing", "coverage"],
  task: ["task", "update", "change", "modify"],
};

function detectKeyword(text: string, map: Record<string, string[]>): string {
  const lower = text.toLowerCase();
  let best = "";
  let bestScore = 0;
  for (const [key, keywords] of Object.entries(map)) {
    const score = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = key; }
  }
  return best;
}

function parseEmailLocally(subject: string, body: string): ParsedEmail {
  const combined = `${subject} ${body}`;
  const pillar = detectKeyword(combined, PILLAR_KEYWORDS) || "general";
  const priority = detectKeyword(combined, PRIORITY_KEYWORDS) || "medium";
  const type = detectKeyword(combined, TYPE_KEYWORDS) || "task";
  const title = subject.trim() || body.split("\n")[0]?.trim().slice(0, 120) || "Untitled task";
  const labels = [`priority:${priority}`, `type:${type}`, "source:email"];
  if (pillar !== "general") labels.push(`pillar:${pillar}`);
  return { title, description: body.trim(), pillar, priority, type, labels };
}

async function parseEmailWithAI(subject: string, body: string): Promise<ParsedEmail> {
  const local = parseEmailLocally(subject, body);
  if (!OPENAI_API_KEY) return local;

  try {
    const res = await openaiChat({
      messages: [
        {
          role: "system",
          content: `Parse this email into a task for a property management super-app (Easy-Locs).
Pillars: dashboard, radar, orbit, wallet, me, marketplace, property, admin, infrastructure.
Return ONLY JSON: {"title":"...", "description":"...", "pillar":"...", "priority":"critical|high|medium|low", "type":"feature|bug|refactor|docs|test|task"}`,
        },
        { role: "user", content: `Subject: ${subject}\n\nBody:\n${body}` },
      ],
      max_tokens: 500,
      temperature: 0.1,
    });
    if (!res.ok) return local;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return local;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return local;
    const parsed = JSON.parse(jsonMatch[0]);
    const labels = [`priority:${parsed.priority || local.priority}`, `type:${parsed.type || local.type}`, "source:email"];
    if ((parsed.pillar || local.pillar) !== "general") labels.push(`pillar:${parsed.pillar || local.pillar}`);
    return {
      title: parsed.title || local.title,
      description: parsed.description || local.description,
      pillar: parsed.pillar || local.pillar,
      priority: parsed.priority || local.priority,
      type: parsed.type || local.type,
      labels,
    };
  } catch { return local; }
}

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  if (!COMMAND_EMAIL_SECRET) {
    console.error("[command-email-intake] COMMAND_EMAIL_SECRET not configured — rejecting request");
    return new Response(JSON.stringify({ error: "Webhook not configured" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const provided = req.headers.get("x-webhook-secret");
  if (provided !== COMMAND_EMAIL_SECRET) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    let fromEmail = "", subject = "", textBody = "";

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      fromEmail = formData.get("from")?.toString() || "";
      subject = formData.get("subject")?.toString() || "";
      textBody = formData.get("text")?.toString() || "";
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
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
});
