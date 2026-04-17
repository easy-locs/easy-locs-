/**
 * AI domain — canonical types shared by the LB1 (#815) adapters.
 *
 * The "ai" domain is the platform-native binding for every model-driven call
 * the codebase makes. There is exactly one (domain, task_type) pair per AI
 * surface so the registry's one-adapter-per-pair invariant holds:
 *
 *   - AI_COMPLETION   — chat / completion / structured-JSON
 *   - AI_EMBEDDING    — vector embeddings
 *   - AI_RAG          — retrieval-augmented generation pipelines
 *   - AI_TOOL_USE     — tool / function-call orchestration
 *
 * Every payload validates here; the adapter never trusts an untyped blob from
 * the dispatcher because malformed input is the #1 cause of silent quota burn.
 */

export const AI_DOMAIN = "ai";

export const AI_TASK_TYPES = {
  COMPLETION: "AI_COMPLETION",
  EMBEDDING: "AI_EMBEDDING",
  RAG: "AI_RAG",
  TOOL_USE: "AI_TOOL_USE",
} as const;

export type AiTaskType = (typeof AI_TASK_TYPES)[keyof typeof AI_TASK_TYPES];

export const AI_AGENT_SLUGS = {
  AI_COMPLETION: "ai.completion",
  AI_EMBEDDING: "ai.embedding",
  AI_RAG: "ai.rag",
  AI_TOOL_USE: "ai.tool_use",
} as const;

export const AI_ERROR_CODES = {
  INVALID_PAYLOAD: "AI_INVALID_PAYLOAD",
  QUOTA_EXCEEDED: "AI_QUOTA_EXCEEDED",
  PROVIDER_FAILED: "AI_PROVIDER_FAILED",
  SENSITIVE_OUTPUT: "AI_SENSITIVE_OUTPUT",
  PERSIST_INTERACTION_FAILED: "AI_PERSIST_INTERACTION_FAILED",
} as const;

export type AiErrorCode = (typeof AI_ERROR_CODES)[keyof typeof AI_ERROR_CODES];

// ── Payload shapes ────────────────────────────────────────────────────────

export interface AiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
}

/** Caller-declared purpose for a completion. Determines whether the
 *  ai-sensitive policy profile is engaged BEFORE the model is called and
 *  forces approval-on-delivery regardless of output content. */
export type AiCompletionPurpose =
  | "general"
  | "contract"
  | "pii_generation"
  | "moderation_override";

export const AI_SENSITIVE_PURPOSES: ReadonlyArray<AiCompletionPurpose> = [
  "contract",
  "pii_generation",
  "moderation_override",
];

export interface AiCompletionPayload {
  feature: string; // free-text caller tag, e.g. "support.triage"
  messages: AiMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: "text" | "json";
  /** Optional caller-side hint that this call is sensitive (e.g. KYC). */
  sensitive?: boolean;
  /** Routes the call through the ai-sensitive policy when set to one of
   *  the sensitive values; defaults to "general". */
  purpose?: AiCompletionPurpose;
  /** Optional list of tools/functions the model may call. Lifted into
   *  v_ai_runs.tools_used so the conversation explorer can render them. */
  tools?: Array<{ name: string; description?: string; arguments?: unknown }>;
}

export interface AiEmbeddingPayload {
  feature: string;
  input: string | string[];
  model?: string;
  dimensions?: number;
}

export interface AiRagPayload {
  feature: string;
  query: string;
  collection: string;
  topK?: number;
  model?: string;
  /** Optional caller-supplied retriever; when omitted the adapter requires
   *  a configured retriever via deps. */
  retrieverArgs?: Record<string, unknown>;
}

export interface AiToolUsePayload {
  feature: string;
  /** The downstream domain task that the tool would dispatch. The tool-use
   *  adapter does NOT execute it — it returns the proposed dispatch and lets
   *  the orchestrator route through the standard approval / dispatch path. */
  proposedDomain: string;
  proposedTaskType: string;
  proposedPayload: Record<string, unknown>;
  rationale?: string;
}

// ── Result shapes ─────────────────────────────────────────────────────────

export interface AiInteractionRecord {
  feature: string;
  provider: "openai" | "anthropic" | "internal";
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  latencyMs: number;
  fallbackUsed: boolean;
  status: "ok" | "error" | "blocked";
  blockReason?: string;
  metadata?: Record<string, unknown>;
}

export interface AiCompletionResult {
  text: string;
  /** Optional structured JSON when responseFormat="json". */
  json?: unknown;
  interaction: AiInteractionRecord;
  /** When the sensitive classifier flagged this output, the orchestrator
   *  flips the task into pending_review (post-execute hook reads this). */
  flaggedSensitive?: boolean;
  flaggedReason?: string;
}

export interface AiEmbeddingResult {
  vectors: number[][];
  dim: number;
  interaction: AiInteractionRecord;
}

export interface AiRagResult {
  answer: string;
  citations: Array<{ id: string; score: number; snippet?: string }>;
  interaction: AiInteractionRecord;
  flaggedSensitive?: boolean;
  flaggedReason?: string;
}

export interface AiToolUseResult {
  proposedDomain: string;
  proposedTaskType: string;
  proposedPayload: Record<string, unknown>;
  rationale: string | null;
  interaction: AiInteractionRecord;
  /** Tool use is ALWAYS held for approval; the orchestrator will never
   *  auto-dispatch the proposed task. */
  flaggedSensitive: true;
  flaggedReason: "tool_use_requires_approval";
}

// ── Validators ────────────────────────────────────────────────────────────

export interface ValidationOk<T> { ok: true; data: T }
export interface ValidationFail { ok: false; reason: string }
export type Validation<T> = ValidationOk<T> | ValidationFail;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function validateCompletionPayload(p: unknown): Validation<AiCompletionPayload> {
  const obj = (p ?? {}) as Record<string, unknown>;
  if (!isNonEmptyString(obj.feature)) return { ok: false, reason: "feature is required" };
  if (!Array.isArray(obj.messages) || obj.messages.length === 0) {
    return { ok: false, reason: "messages must be a non-empty array" };
  }
  for (const m of obj.messages as unknown[]) {
    const mm = (m ?? {}) as Record<string, unknown>;
    if (!isNonEmptyString(mm.role) || !isNonEmptyString(mm.content)) {
      return { ok: false, reason: "each message needs role + content" };
    }
    if (!["system", "user", "assistant", "tool"].includes(mm.role as string)) {
      return { ok: false, reason: `unknown role ${String(mm.role)}` };
    }
  }
  return { ok: true, data: obj as unknown as AiCompletionPayload };
}

export function validateEmbeddingPayload(p: unknown): Validation<AiEmbeddingPayload> {
  const obj = (p ?? {}) as Record<string, unknown>;
  if (!isNonEmptyString(obj.feature)) return { ok: false, reason: "feature is required" };
  const inp = obj.input;
  const okInp = isNonEmptyString(inp) ||
    (Array.isArray(inp) && inp.length > 0 && inp.every(isNonEmptyString));
  if (!okInp) return { ok: false, reason: "input must be string or non-empty string[]" };
  return { ok: true, data: obj as unknown as AiEmbeddingPayload };
}

export function validateRagPayload(p: unknown): Validation<AiRagPayload> {
  const obj = (p ?? {}) as Record<string, unknown>;
  if (!isNonEmptyString(obj.feature)) return { ok: false, reason: "feature is required" };
  if (!isNonEmptyString(obj.query)) return { ok: false, reason: "query is required" };
  if (!isNonEmptyString(obj.collection)) return { ok: false, reason: "collection is required" };
  return { ok: true, data: obj as unknown as AiRagPayload };
}

export function validateToolUsePayload(p: unknown): Validation<AiToolUsePayload> {
  const obj = (p ?? {}) as Record<string, unknown>;
  if (!isNonEmptyString(obj.feature)) return { ok: false, reason: "feature is required" };
  if (!isNonEmptyString(obj.proposedDomain)) {
    return { ok: false, reason: "proposedDomain is required" };
  }
  if (!isNonEmptyString(obj.proposedTaskType)) {
    return { ok: false, reason: "proposedTaskType is required" };
  }
  if (typeof obj.proposedPayload !== "object" || obj.proposedPayload === null) {
    return { ok: false, reason: "proposedPayload must be an object" };
  }
  return { ok: true, data: obj as unknown as AiToolUsePayload };
}
