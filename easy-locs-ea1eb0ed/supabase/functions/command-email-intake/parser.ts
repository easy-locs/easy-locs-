// LB1 Track 1 (#841) — Email parser extracted from index.ts so the AI
// dispatch path is independently importable / testable. The Deno edge
// function in `index.ts` re-exports `parseEmailWithAI` from here.
//
// This module has zero Deno-specific top-level code. Provider-key resolution
// lives in the registered AI router metadata, NOT here. On dispatch failure
// we degrade gracefully to the local rule-based parser below.

import { dispatchAiCompletion } from "../_shared/execution/ai-dispatch.ts";

export interface ParsedEmail {
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

export function parseEmailLocally(subject: string, body: string): ParsedEmail {
  const combined = `${subject} ${body}`;
  const pillar = detectKeyword(combined, PILLAR_KEYWORDS) || "general";
  const priority = detectKeyword(combined, PRIORITY_KEYWORDS) || "medium";
  const type = detectKeyword(combined, TYPE_KEYWORDS) || "task";
  const title = subject.trim() || body.split("\n")[0]?.trim().slice(0, 120) || "Untitled task";
  const labels = [`priority:${priority}`, `type:${type}`, "source:email"];
  if (pillar !== "general") labels.push(`pillar:${pillar}`);
  return { title, description: body.trim(), pillar, priority, type, labels };
}

export async function parseEmailWithAI(subject: string, body: string): Promise<ParsedEmail> {
  const local = parseEmailLocally(subject, body);

  try {
    const outcome = await dispatchAiCompletion(
      {
        feature: "command-email-intake",
        messages: [
          {
            role: "system",
            content: `Parse this email into a task for a property management super-app (Easy-Locs).
Pillars: dashboard, radar, orbit, wallet, me, marketplace, property, admin, infrastructure.
Return ONLY JSON: {"title":"...", "description":"...", "pillar":"...", "priority":"critical|high|medium|low", "type":"feature|bug|refactor|docs|test|task"}`,
          },
          { role: "user", content: `Subject: ${subject}\n\nBody:\n${body}` },
        ],
        maxTokens: 500,
        temperature: 0.1,
        purpose: "general",
      },
      { feature: "command-email-intake" },
    );
    if (outcome.status !== "succeeded" || !outcome.output) {
      console.warn(
        "[command-email-intake] AI parse not succeeded — falling back to local parser:",
        outcome.status,
        outcome.errorCode,
        outcome.errorMessage ?? outcome.blockedReason,
      );
      return local;
    }
    const content = outcome.output.text?.trim();
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
  } catch (err) {
    console.warn(
      "[command-email-intake] AI parse threw — falling back to local parser:",
      err instanceof Error ? err.message : String(err),
    );
    return local;
  }
}
