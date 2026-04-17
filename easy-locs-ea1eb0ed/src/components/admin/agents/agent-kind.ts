/**
 * Kind → icon / label / colour map for the L4 cockpit (#813).
 *
 * The cockpit MUST stay kind-agnostic in logic — the only place we
 * branch on `agent_kind` is presentation (icon + badge tone). When a
 * brand-new kind is registered (e.g. `dev.builder`, `ai.evaluator`),
 * adding it here is a one-line change and the table picks it up
 * automatically. Anything not listed falls back to the generic
 * placeholder so unknown kinds still render cleanly.
 */
import {
  Building2,
  Brain,
  Code2,
  Cpu,
  Sparkles,
  Wrench,
  Rocket,
  ShieldCheck,
  Workflow,
  ServerCog,
  Activity,
  type LucideIcon,
} from "lucide-react";

export type BadgeTone = "default" | "secondary" | "outline" | "destructive";

export interface AgentKindMeta {
  /** Human-friendly label rendered in the table chip. */
  label: string;
  /** Lucide icon component rendered next to the label. */
  Icon: LucideIcon;
  /** Badge variant used by the chip. */
  tone: BadgeTone;
}

/**
 * Kind keys MUST match the canonical values registered in
 * `system.agents.agent_kind`. Adding an entry here without registering
 * the kind is harmless; the inverse will simply render as "unknown".
 */
export const AGENT_KIND_META: Record<string, AgentKindMeta> = {
  "business.adapter": { label: "Business", Icon: Building2, tone: "secondary" },
  "ai.router":        { label: "AI Router", Icon: Brain, tone: "default" },
  "ai.tool":          { label: "AI Tool", Icon: Sparkles, tone: "default" },
  "ai.evaluator":     { label: "AI Evaluator", Icon: ShieldCheck, tone: "outline" },
  "ops.scheduler":    { label: "Scheduler", Icon: Workflow, tone: "secondary" },
  "dev.builder":      { label: "Dev · Builder", Icon: Code2, tone: "outline" },
  "dev.reviewer":     { label: "Dev · Reviewer", Icon: ShieldCheck, tone: "outline" },
  "dev.deployer":     { label: "Dev · Deployer", Icon: Rocket, tone: "outline" },
  "asis.cognitive":   { label: "ASIS", Icon: Cpu, tone: "default" },
  "system.internal":  { label: "Platform", Icon: ServerCog, tone: "secondary" },
};

const FALLBACK: AgentKindMeta = {
  label: "Unknown",
  Icon: Activity,
  tone: "outline",
};

export function getKindMeta(kind: string | null | undefined): AgentKindMeta {
  if (!kind) return FALLBACK;
  return AGENT_KIND_META[kind] ?? { ...FALLBACK, label: kind };
}

/** Derived list for filter dropdowns — keeps order stable & alphabetic. */
export const KNOWN_AGENT_KINDS: string[] = Object.keys(AGENT_KIND_META).sort();

// Keep an unused-import guard so the icon imports above never get
// tree-shaken if a kind is temporarily commented out.
export const __ICONS_KEEPALIVE = [Wrench];
