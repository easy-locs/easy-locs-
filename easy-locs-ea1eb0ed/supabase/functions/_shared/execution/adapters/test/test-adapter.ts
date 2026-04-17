/**
 * TestAdapter — LC2 (task #872).
 *
 * Wraps the Vitest runner behind the canonical DomainAdapter contract so
 * dev.* agents can request a deterministic test pass via execution_tasks.
 *
 * The runner callback is injectable: edge functions wire a Deno.Command
 * runner that parses Vitest JSON output; tests pass a stub.
 *
 * Rollback strategy is `none` — tests never mutate the system of record.
 */

import type {
  AdapterResult,
  DomainAdapter,
  ExecutionContext,
} from "../../types.ts";
import {
  TEST_DOMAIN,
  TEST_ERROR_CODES,
  TEST_EVENTS,
  TEST_TASK_TYPES,
  type TestRunPayload,
  type TestRunResult,
  type TestRunnerResult,
} from "./types.ts";

export type TestRunner = (args: {
  command: string;
  workspace: string;
  pattern: string | null;
  taskId: string;
}) => Promise<TestRunnerResult>;

export interface TestAdapterDeps {
  runner?: TestRunner;
  defaultWorkspace?: string;
  defaultCommand?: string;
}

function jsonLog(event: string, fields: Record<string, unknown>): string {
  return JSON.stringify({ event, ts: new Date().toISOString(), ...fields });
}

function defaultRunner(): TestRunner {
  return async () => {
    throw new Error(
      "TestAdapter: no runner provided. Bootstrap from the edge function " +
        "(or test) and pass an explicit `runner`.",
    );
  };
}

export function createTestAdapter(deps: TestAdapterDeps = {}): DomainAdapter {
  const runner = deps.runner ?? defaultRunner();
  const defaultWorkspace = deps.defaultWorkspace ?? ".";
  const defaultCommand = deps.defaultCommand ?? "vitest run";

  return {
    domain: TEST_DOMAIN,
    taskType: TEST_TASK_TYPES.RUN,
    rollback_strategy: "none",

    agent: {
      slug: "test.run",
      version: "1.0.0",
      kind: "code.tool",
      displayName: "Test Runner (Vitest)",
      ownerTeam: "platform-dev",
      policyProfile: "dev-default",
      metadata: {
        description:
          "Runs the Vitest suite, reports pass/fail/skip + coverage and " +
          "build-minutes cost.",
        rollback_strategy: "none",
      },
    },

    getLockKey(task) {
      return `test:${task.id}`;
    },

    getIdempotencyKey(task) {
      return task.idempotency_key ?? null;
    },

    async execute(ctx: ExecutionContext): Promise<AdapterResult> {
      const { task } = ctx;
      const payload = (task.payload ?? {}) as TestRunPayload;

      if (payload && typeof payload !== "object") {
        return {
          success: false,
          errorCode: TEST_ERROR_CODES.INVALID_PAYLOAD,
          errorMessage: "test.run payload must be an object",
          logs: [jsonLog(TEST_EVENTS.FAILED, {
            task_id: task.id,
            reason: "invalid_payload",
          })],
        };
      }

      const command = payload.command?.trim() || defaultCommand;
      const workspace = payload.workspace?.trim() || defaultWorkspace;
      const pattern = payload.pattern?.trim() || null;
      const label = payload.label?.trim() || null;

      const startedAt = Date.now();
      const startLog = jsonLog(TEST_EVENTS.STARTED, {
        task_id: task.id,
        command,
        workspace,
        pattern,
        label,
      });

      let runnerResult: TestRunnerResult;
      try {
        runnerResult = await runner({ command, workspace, pattern, taskId: task.id });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          success: false,
          errorCode: TEST_ERROR_CODES.RUNNER_THREW,
          errorMessage: `test runner threw: ${message}`,
          logs: [
            startLog,
            jsonLog(TEST_EVENTS.FAILED, {
              task_id: task.id,
              reason: "runner_threw",
              message,
              duration_ms: Date.now() - startedAt,
            }),
          ],
          actionsTaken: ["runner_invoked"],
        };
      }

      const durationMs = runnerResult.durationMs > 0
        ? runnerResult.durationMs
        : Date.now() - startedAt;
      const buildMinutes = runnerResult.buildMinutes > 0
        ? runnerResult.buildMinutes
        : Math.round((durationMs / 60_000) * 10_000) / 10_000;

      const baseFields = {
        task_id: task.id,
        command,
        pattern,
        label,
        passed: runnerResult.passed,
        failed: runnerResult.failed,
        skipped: runnerResult.skipped,
        duration_ms: durationMs,
        build_minutes: buildMinutes,
        coverage: runnerResult.coverage,
        exit_code: runnerResult.exitCode,
      };

      const failed = runnerResult.exitCode !== 0 || runnerResult.failed > 0;
      const baseOutput: TestRunResult = {
        ...runnerResult,
        durationMs,
        buildMinutes,
        status: failed ? "failed" : "succeeded",
        cost_usd: buildMinutes,
        latency_ms: durationMs,
        command,
        pattern,
        label,
      };

      if (failed) {
        return {
          success: false,
          errorCode: TEST_ERROR_CODES.TESTS_FAILED,
          errorMessage: `vitest reported ${runnerResult.failed} failing test(s) (exit ${runnerResult.exitCode})`,
          logs: [
            startLog,
            jsonLog(TEST_EVENTS.FAILED, {
              ...baseFields,
              stderr_tail: runnerResult.stderrTail,
            }),
          ],
          actionsTaken: ["runner_invoked"],
          output: baseOutput as unknown as Record<string, unknown>,
        };
      }

      return {
        success: true,
        output: baseOutput as unknown as Record<string, unknown>,
        logs: [startLog, jsonLog(TEST_EVENTS.COMPLETED, baseFields)],
        actionsTaken: ["runner_invoked", "results_parsed"],
      };
    },
  };
}
