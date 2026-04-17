/**
 * AI verifier — LB1 (#815).
 *
 * Verification for AI tasks is necessarily structural rather than
 * semantic — we cannot re-run a non-deterministic model and demand byte
 * equality. What we DO check, post-execute:
 *
 *   - The result blob carries an `interaction` record (provider+model+tokens).
 *   - For COMPLETION: a non-empty `text` field exists.
 *   - For EMBEDDING:  `vectors` is a non-empty 2-D number array with `dim>0`.
 *   - For RAG:        `answer` is a string (citations may be empty).
 *   - For TOOL_USE:   the proposed (domain, taskType) shape is preserved.
 *
 * A failure flips the task into `failed` with `error_code = VERIFICATION_MISMATCH`
 * — same posture as the marketplace verifier. Sensitive-output flagging is
 * NOT a verifier concern; the orchestrator's post-execute hook handles that.
 */

import type { TaskVerifier, VerifierResult } from "../../verifier-registry.ts";
import { AI_DOMAIN, AI_TASK_TYPES, type AiTaskType } from "./types.ts";

function fail(path: string, expected: unknown, actual: unknown): VerifierResult {
  return { ok: false, mismatchPath: path, expected, actual };
}

function checkInteraction(result: Record<string, unknown>): VerifierResult | null {
  const ai = result.interaction as Record<string, unknown> | undefined;
  if (!ai || typeof ai !== "object") {
    return fail("interaction", "{provider,model,tokens}", null);
  }
  if (typeof ai.provider !== "string" || ai.provider === "") {
    return fail("interaction.provider", "non-empty string", ai.provider ?? null);
  }
  if (typeof ai.model !== "string" || ai.model === "") {
    return fail("interaction.model", "non-empty string", ai.model ?? null);
  }
  if (typeof ai.promptTokens !== "number" || typeof ai.completionTokens !== "number") {
    return fail(
      "interaction.tokens",
      "promptTokens+completionTokens numeric",
      { p: ai.promptTokens, c: ai.completionTokens },
    );
  }
  return null;
}

function buildVerifier(taskType: AiTaskType): TaskVerifier {
  return {
    domain: AI_DOMAIN,
    taskType,
    async verify(_task, executionResult): Promise<VerifierResult> {
      const result = executionResult ?? {};
      const interactionFail = checkInteraction(result);
      if (interactionFail) return interactionFail;

      switch (taskType) {
        case AI_TASK_TYPES.COMPLETION: {
          if (typeof result.text !== "string" || (result.text as string).length === 0) {
            return fail("text", "non-empty string", result.text ?? null);
          }
          return { ok: true };
        }
        case AI_TASK_TYPES.EMBEDDING: {
          const vecs = result.vectors as unknown;
          const dim = result.dim as unknown;
          if (!Array.isArray(vecs) || vecs.length === 0) {
            return fail("vectors", "non-empty number[][]", vecs ?? null);
          }
          if (!Array.isArray(vecs[0]) || (vecs[0] as unknown[]).length === 0) {
            return fail("vectors[0]", "non-empty number[]", vecs[0] ?? null);
          }
          if (typeof dim !== "number" || dim <= 0) {
            return fail("dim", "positive number", dim ?? null);
          }
          return { ok: true };
        }
        case AI_TASK_TYPES.RAG: {
          if (typeof result.answer !== "string") {
            return fail("answer", "string", result.answer ?? null);
          }
          if (!Array.isArray(result.citations)) {
            return fail("citations", "array", result.citations ?? null);
          }
          return { ok: true };
        }
        case AI_TASK_TYPES.TOOL_USE: {
          for (const k of ["proposedDomain", "proposedTaskType", "proposedPayload"] as const) {
            if (!(k in result)) return fail(k, "present", null);
          }
          if (typeof result.proposedDomain !== "string") {
            return fail("proposedDomain", "string", result.proposedDomain ?? null);
          }
          return { ok: true };
        }
        default:
          return fail("taskType", "known AI task type", taskType);
      }
    },
  };
}

export function createAiVerifier(taskType: AiTaskType): TaskVerifier {
  return buildVerifier(taskType);
}
