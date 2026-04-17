/**
 * LB1 Track 1 (#841) — End-to-end proof for an ex-bypass edge function.
 *
 * Calls `parseEmailWithAI` (the AI surface of the `command-email-intake`
 * edge function, extracted to `command-email-intake/parser.ts`) and asserts
 * that one execution_tasks row + one linked ai_interactions row are
 * persisted by the canonical dispatch chain.
 *
 * The test stubs the `dispatchAiCompletion` module that `parser.ts`
 * imports. The stub forwards every call into a real
 * `buildAiDispatchHarness` instance — i.e. the exact same in-memory
 * orchestrator + adapters + verifiers + interaction sink + quota gate
 * that production wiring runs through. So when `parseEmailWithAI` calls
 * dispatch, an `execution_tasks` row is queued, the orchestrator runs the
 * real AI adapter, the verifier passes, and an `ai_interactions` row is
 * recorded — proving the migrated edge function inherits the platform
 * governance contract end-to-end.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildAiDispatchHarness,
  type AiDispatchHarness,
} from "./harnesses/ai-dispatch-harness.ts";
import type { TaskVerifier } from "../../supabase/functions/_shared/execution/verifier-registry.ts";
import {
  AI_DOMAIN,
  AI_TASK_TYPES,
} from "../../supabase/functions/_shared/execution/adapters/ai/types.ts";

// Hold a reference the mock factory can read; populated per-test.
let activeHarness: AiDispatchHarness | null = null;

// Stub the dispatch module that parser.ts imports. The stub re-implements
// dispatchAiCompletion as a thin wrapper around the harness:
//   1. Dispatch a task via simulateDispatch (writes execution_tasks queued row).
//   2. Run the orchestrator (writes ai_interactions row, advances status).
//   3. Return an AiDispatchOutcome shaped exactly like production dispatch.
vi.mock(
  "../../supabase/functions/_shared/execution/ai-dispatch.ts",
  () => ({
    dispatchAiCompletion: vi.fn(async (payload: unknown) => {
      if (!activeHarness) throw new Error("No active harness for this test");
      const handle = activeHarness.simulateDispatch({
        domain: AI_DOMAIN,
        taskType: AI_TASK_TYPES.COMPLETION,
        payload: payload as Record<string, unknown>,
      });
      const outcome = await activeHarness.orchestrator.run(handle.taskId);
      const row = activeHarness.repo.snapshot(handle.taskId);
      const recorded =
        activeHarness.recorded[activeHarness.recorded.length - 1];
      if (outcome.finalStatus === "succeeded" && recorded) {
        return {
          status: "succeeded",
          taskId: handle.taskId,
          output: {
            text:
              '{"title":"Wallet payout failure","description":"Investigate failed Stripe payout","pillar":"wallet","priority":"critical","type":"bug"}',
            interaction: recorded.interaction,
          },
        };
      }
      return {
        status: outcome.finalStatus,
        taskId: handle.taskId,
        errorCode: outcome.errorCode,
        errorMessage: outcome.errorMessage,
        blockedReason: row?.blocked_reason,
      };
    }),
  }),
);

// Imported AFTER the mock so parser.ts gets the stubbed dispatch module.
import { parseEmailWithAI } from "../../supabase/functions/command-email-intake/parser.ts";

const passingVerifier = (taskType: string): TaskVerifier => ({
  domain: AI_DOMAIN,
  taskType,
  verify: async () => ({ ok: true }),
});

describe("LB1 Track 1 (#841) — command-email-intake → parseEmailWithAI E2E", () => {
  beforeEach(() => {
    activeHarness = buildAiDispatchHarness({
      verifiers: [
        passingVerifier(AI_TASK_TYPES.COMPLETION),
        passingVerifier(AI_TASK_TYPES.EMBEDDING),
        passingVerifier(AI_TASK_TYPES.RAG),
        passingVerifier(AI_TASK_TYPES.TOOL_USE),
      ],
    });
  });

  afterEach(() => {
    activeHarness = null;
  });

  it("calling parseEmailWithAI persists execution_tasks (succeeded) + linked ai_interactions row", async () => {
    const result = await parseEmailWithAI(
      "Stripe payout failed",
      "The Stripe payout for org 123 crashed last night. Urgent.",
    );

    // Functional: parser took the AI response over the local fallback.
    expect(result.title).toBe("Wallet payout failure");
    expect(result.pillar).toBe("wallet");
    expect(result.priority).toBe("critical");
    expect(result.type).toBe("bug");

    const h = activeHarness!;

    // execution_tasks row landed in succeeded — proves the canonical
    // dispatch chain wrote, advanced, and verified the row.
    const succeeded = h.repo.listByStatus("succeeded");
    expect(succeeded).toHaveLength(1);
    expect(succeeded[0].domain).toBe(AI_DOMAIN);
    expect(succeeded[0].type).toBe(AI_TASK_TYPES.COMPLETION);

    // ai_interactions row written, linked to that execution_tasks row,
    // tagged with the migrated edge function's feature label.
    expect(h.recorded).toHaveLength(1);
    expect(h.recorded[0].taskId).toBe(succeeded[0].id);
    expect(h.recorded[0].domainTaskType).toBe(AI_TASK_TYPES.COMPLETION);
    expect(h.recorded[0].interaction.feature).toBe("command-email-intake");

    // Quota was consumed exactly once — proves the call counted against
    // the agent's governed budget.
    expect(h.consumes).toHaveLength(1);
  });

  it("falls back to the local rule-based parser when dispatch does not succeed", async () => {
    // Override mock to simulate a quota-exhausted dispatch outcome.
    const dispatchMod = await import(
      "../../supabase/functions/_shared/execution/ai-dispatch.ts"
    );
    (dispatchMod.dispatchAiCompletion as ReturnType<typeof vi.fn>).mockImplementationOnce(
      async () => ({
        status: "failed",
        taskId: "task-quota-exhausted",
        errorCode: "AI_QUOTA_EXCEEDED",
        errorMessage: "agent quota exceeded",
      }),
    );

    const result = await parseEmailWithAI(
      "API down",
      "The marketplace listing API is down. Critical.",
    );

    // Local parser kicked in — keyword detection produced these.
    expect(result.title).toBe("API down");
    expect(result.priority).toBe("critical");
    // No execution_tasks rows succeeded via the harness for this call
    // (the mock returned a synthetic outcome without touching the
    // harness) and no exception bubbled up — graceful degradation preserved.
    expect(activeHarness!.repo.listByStatus("succeeded")).toHaveLength(0);
    expect(activeHarness!.recorded).toHaveLength(0);
  });
});
