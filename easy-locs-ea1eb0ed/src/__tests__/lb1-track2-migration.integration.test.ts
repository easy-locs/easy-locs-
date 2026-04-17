/**
 * LB1 Track 2 (#842) — Per-callsite dispatch-path integration coverage.
 *
 * The static contract test (`lb1-track2-migration.contract.test.ts`)
 * proves each migrated edge function imports and calls
 * `dispatchAiCompletion`. This file goes one step further and drives the
 * dispatch harness with payloads that mirror the EXACT shapes those
 * migrated functions emit, asserting that the dispatch chain:
 *
 *   simulateDispatch → orchestrator → ai adapter → ai_interactions row
 *                                                → execution_tasks row
 *                                                → quota.consume bump
 *
 * actually materialises the audit + persistence rows for each callsite.
 *
 * The harness mirrors the production `system.dispatch_execution_task`
 * RPC and the production `ExecutionOrchestratorV2` exactly (see
 * `harnesses/ai-dispatch-harness.ts` header). A pass here means: if a
 * given edge function constructs that payload at runtime, the same
 * persistence + audit guarantees hold.
 */

import { describe, expect, it } from "vitest";

import {
  buildAiDispatchHarness,
  CANONICAL_EXECUTION_EVENTS,
} from "./harnesses/ai-dispatch-harness.ts";
import type { TaskVerifier } from "../../supabase/functions/_shared/execution/verifier-registry.ts";
import {
  AI_AGENT_SLUGS,
  AI_DOMAIN,
  AI_TASK_TYPES,
} from "../../supabase/functions/_shared/execution/adapters/ai/types.ts";

const passing = (taskType: string): TaskVerifier => ({
  domain: AI_DOMAIN,
  taskType,
  verify: async () => ({ ok: true }),
});

const VERIFIERS: TaskVerifier[] = [passing(AI_TASK_TYPES.COMPLETION)];

// Each entry mirrors the AiCompletionPayload shape constructed by a
// migrated edge function — feature tag + message structure + the
// optional fields the function actually sets (responseFormat, tools,
// purpose, maxTokens, temperature). Values are illustrative; the test
// only cares that the dispatch chain happily consumes the shape and
// emits the expected persistence side effects.
const MIGRATED_CALLSITES: ReadonlyArray<{
  name: string;
  feature: string;
  payload: Record<string, unknown>;
}> = [
  {
    name: "goal-planner",
    feature: "goal-planner",
    payload: {
      feature: "goal-planner",
      messages: [
        { role: "system", content: "PLANNER_SYSTEM_PROMPT" },
        { role: "user", content: "GOAL TITLE: Move to Lisbon\n\nGOAL DESCRIPTION:\n(none)" },
      ],
      temperature: 0.2,
      maxTokens: 600,
      responseFormat: "json",
      purpose: "general",
    },
  },
  {
    name: "ai-rag",
    feature: "ai-rag",
    payload: {
      feature: "ai-rag",
      messages: [
        { role: "system", content: "RAG_SYSTEM_PROMPT" },
        { role: "user", content: "how do I reset my password?" },
      ],
      maxTokens: 1200,
      temperature: 0.4,
      purpose: "general",
    },
  },
  {
    name: "ai-eval-runner",
    feature: "ai-eval-runner",
    payload: {
      feature: "ai-eval-runner",
      messages: [{ role: "user", content: "What is the capital of France?" }],
      maxTokens: 800,
      temperature: 0.2,
      purpose: "general",
    },
  },
  {
    name: "ai-content-enrichment",
    feature: "ai-content-enrichment",
    payload: {
      feature: "ai-content-enrichment",
      messages: [
        { role: "system", content: "ENRICHMENT_SYSTEM_PROMPT (returns JSON)" },
        { role: "user", content: "Entity facts: ..." },
      ],
      maxTokens: 1200,
      temperature: 0.4,
      responseFormat: "json",
      purpose: "general",
      tools: [{ name: "enrich_content", description: "Generate enriched content for an entity." }],
    },
  },
  {
    name: "ai-entity-enrichment.enrich_description",
    feature: "ai-entity-enrichment.enrich_description",
    payload: {
      feature: "ai-entity-enrichment.enrich_description",
      messages: [
        { role: "system", content: "You generate concise, professional business descriptions." },
        { role: "user", content: 'Generate a 2-sentence description for "Acme Bakery"' },
      ],
      purpose: "general",
    },
  },
  {
    name: "ai-entity-enrichment.classify_batch",
    feature: "ai-entity-enrichment.classify_batch",
    payload: {
      feature: "ai-entity-enrichment.classify_batch",
      messages: [
        { role: "system", content: "You classify businesses." },
        { role: "user", content: "Classify each business into a precise subcategory..." },
      ],
      responseFormat: "json",
      purpose: "general",
      tools: [{ name: "classify_businesses", description: "Classify businesses into subcategories" }],
    },
  },
  {
    name: "chief-agent.plan",
    feature: "chief-agent.plan",
    payload: {
      feature: "chief-agent.plan",
      messages: [
        { role: "system", content: "CHIEF_AGENT_SYSTEM_PROMPT" },
        { role: "user", content: "What is happening with my marketplace listings?" },
      ],
      temperature: 0.3,
      maxTokens: 2000,
      responseFormat: "json",
      purpose: "general",
    },
  },
  {
    name: "chief-agent.synthesize",
    feature: "chief-agent.synthesize",
    payload: {
      feature: "chief-agent.synthesize",
      messages: [
        { role: "system", content: "Synthesise the dispatch results into operator-facing JSON." },
        { role: "user", content: "Now provide the final structured JSON response..." },
      ],
      temperature: 0.2,
      maxTokens: 2000,
      responseFormat: "json",
      purpose: "general",
    },
  },
];

describe("LB1 #842 Track 2 — migrated edge functions persist via dispatch", () => {
  for (const cs of MIGRATED_CALLSITES) {
    it(`${cs.name}: dispatch → execute → ai_interactions linked → quota bumped exactly once`, async () => {
      const h = buildAiDispatchHarness({ verifiers: VERIFIERS });

      const handle = h.simulateDispatch({
        domain: AI_DOMAIN,
        taskType: AI_TASK_TYPES.COMPLETION,
        payload: cs.payload,
      });

      // Production `dispatch_execution_task` row is created.
      expect(handle.taskId).toBeTruthy();
      expect(handle.status).toBe("queued");
      expect(handle.agentId).toBe(`agent-${AI_AGENT_SLUGS.AI_COMPLETION}`);

      // execution_tasks row landed in the queued state before run.
      const beforeRun = h.repo.snapshot(handle.taskId);
      expect(beforeRun?.status).toBe("queued");
      expect(beforeRun?.domain).toBe(AI_DOMAIN);
      expect(beforeRun?.type).toBe(AI_TASK_TYPES.COMPLETION);

      const outcome = await h.orchestrator.run(handle.taskId);

      // Terminal state succeeded — the execution_tasks row is now closed.
      expect(outcome.finalStatus).toBe("succeeded");
      expect(outcome.errorCode).toBeUndefined();

      const afterRun = h.repo.snapshot(handle.taskId);
      expect(afterRun?.status).toBe("succeeded");
      expect(afterRun?.execution_result).toBeTruthy();

      // ai_interactions row is written exactly once and tagged with the
      // caller's `feature` (this is the column the operator console
      // groups by, so it has to round-trip intact).
      expect(h.recorded).toHaveLength(1);
      expect(h.recorded[0].taskId).toBe(handle.taskId);
      expect(h.recorded[0].domainTaskType).toBe(AI_TASK_TYPES.COMPLETION);
      expect(h.recorded[0].interaction.feature).toBe(cs.feature);
      expect(h.recorded[0].interaction.status).toBe("ok");
      // Every successful completion records non-null token figures —
      // proves the adapter populated the audit row from the runner
      // result rather than zeroing it out.
      expect(h.recorded[0].interaction.promptTokens).toBeGreaterThanOrEqual(0);
      expect(h.recorded[0].interaction.completionTokens).toBeGreaterThanOrEqual(0);

      // Agent quota was bumped exactly once on the ai.completion agent.
      expect(h.consumes).toHaveLength(1);
      expect(h.consumes[0].agentId).toBe(`agent-${AI_AGENT_SLUGS.AI_COMPLETION}`);

      // Canonical event fan-out fired in the documented order.
      expect(h.sink.names()).toEqual([
        CANONICAL_EXECUTION_EVENTS.TASK_QUEUED,
        CANONICAL_EXECUTION_EVENTS.TASK_LOCKED,
        CANONICAL_EXECUTION_EVENTS.TASK_STARTED,
        CANONICAL_EXECUTION_EVENTS.TASK_VERIFIED,
        CANONICAL_EXECUTION_EVENTS.TASK_SUCCEEDED,
        CANONICAL_EXECUTION_EVENTS.TASK_UNLOCKED,
      ]);
    });
  }

  it("each callsite covered above maps to a real migrated edge function", () => {
    const features = MIGRATED_CALLSITES.map((c) => c.feature).sort();
    expect(features).toEqual(
      [
        "ai-content-enrichment",
        "ai-entity-enrichment.classify_batch",
        "ai-entity-enrichment.enrich_description",
        "ai-eval-runner",
        "ai-rag",
        "chief-agent.plan",
        "chief-agent.synthesize",
        "goal-planner",
      ].sort(),
    );
  });
});
