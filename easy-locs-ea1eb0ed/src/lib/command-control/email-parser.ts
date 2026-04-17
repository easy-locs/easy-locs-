import type { ParsedEmail, EmailPriority, EmailTaskType } from "./types";
import { supabase } from "@/integrations/supabase/client";

const PILLAR_KEYWORDS: Record<string, string[]> = {
  dashboard: ["dashboard", "home", "overview", "stats", "analytics", "kpi"],
  radar: ["radar", "discovery", "search", "browse", "explore", "map", "geo"],
  orbit: ["orbit", "chat", "message", "communication", "call", "contact"],
  wallet: ["wallet", "payment", "transaction", "money", "stripe", "checkout"],
  me: ["me", "profile", "account", "settings", "preferences"],
  marketplace: ["marketplace", "listing", "booking", "service", "concierge"],
  property: ["property", "lease", "tenant", "rent", "building", "maintenance"],
  admin: ["admin", "moderation", "approval", "queue", "ops"],
  infrastructure: ["infra", "database", "supabase", "deploy", "ci", "cd", "performance", "api"],
};

const PRIORITY_KEYWORDS: Record<EmailPriority, string[]> = {
  critical: ["urgent", "critical", "emergency", "broken", "down", "outage", "crash", "p0"],
  high: ["important", "high priority", "asap", "blocker", "p1"],
  medium: ["medium", "normal", "standard", "p2"],
  low: ["low priority", "nice to have", "when possible", "minor", "p3"],
};

const TYPE_KEYWORDS: Record<EmailTaskType, string[]> = {
  bug: ["bug", "error", "broken", "fix", "issue", "defect", "regression", "crash", "fail"],
  feature: ["feature", "add", "new", "implement", "create", "build", "enhance"],
  refactor: ["refactor", "clean", "restructure", "improve", "optimize", "tech debt"],
  docs: ["docs", "documentation", "readme", "guide", "wiki"],
  test: ["test", "testing", "coverage", "spec", "e2e", "unit test"],
  task: ["task", "update", "change", "modify", "configure"],
};

function detectPillar(text: string): string {
  const lower = text.toLowerCase();
  let bestMatch = "general";
  let bestScore = 0;

  for (const [pillar, keywords] of Object.entries(PILLAR_KEYWORDS)) {
    const score = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = pillar;
    }
  }
  return bestMatch;
}

function detectPriority(text: string): EmailPriority {
  const lower = text.toLowerCase();
  for (const [priority, keywords] of Object.entries(PRIORITY_KEYWORDS) as [EmailPriority, string[]][]) {
    if (keywords.some((kw) => lower.includes(kw))) return priority;
  }
  return "medium";
}

function detectType(text: string): EmailTaskType {
  const lower = text.toLowerCase();
  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS) as [EmailTaskType, string[]][]) {
    if (keywords.some((kw) => lower.includes(kw))) return type;
  }
  return "task";
}

function generateLabels(parsed: { pillar: string; priority: EmailPriority; type: EmailTaskType }): string[] {
  const labels: string[] = [];
  labels.push(`priority:${parsed.priority}`);
  labels.push(`type:${parsed.type}`);
  if (parsed.pillar !== "general") labels.push(`pillar:${parsed.pillar}`);
  labels.push("source:email");
  return labels;
}

export function parseEmailLocally(subject: string, body: string): ParsedEmail {
  const combined = `${subject} ${body}`;
  const pillar = detectPillar(combined);
  const priority = detectPriority(combined);
  const type = detectType(combined);

  const title = subject.trim() || body.split("\n")[0]?.trim().slice(0, 120) || "Untitled task from email";
  const description = body.trim();
  const labels = generateLabels({ pillar, priority, type });

  return { title, description, pillar, priority, type, labels };
}

// LB Closeout #852 — frontend no longer holds a provider key. The AI parse
// path is delegated to the session-authenticated `command-email-parse`
// Edge Function (sibling to the HMAC-gated `command-email-intake` webhook),
// which routes through `dispatchAiCompletion` so the call is governed
// (quota, audit, sensitive routing). Local rule-based fallback is preserved
// on any error so the UI degrades gracefully.
export async function parseEmailWithAI(
  subject: string,
  body: string,
): Promise<ParsedEmail> {
  const localParsed = parseEmailLocally(subject, body);

  try {
    const { data, error } = await supabase.functions.invoke("command-email-parse", {
      body: { subject, body },
    });

    if (error || !data) return localParsed;

    const parsed = (data.parsed ?? data) as Partial<ParsedEmail>;
    return {
      title: parsed.title || localParsed.title,
      description: parsed.description || localParsed.description,
      pillar: parsed.pillar || localParsed.pillar,
      priority: parsed.priority || localParsed.priority,
      type: parsed.type || localParsed.type,
      labels: generateLabels({
        pillar: parsed.pillar || localParsed.pillar,
        priority: parsed.priority || localParsed.priority,
        type: parsed.type || localParsed.type,
      }),
    };
  } catch {
    return localParsed;
  }
}
