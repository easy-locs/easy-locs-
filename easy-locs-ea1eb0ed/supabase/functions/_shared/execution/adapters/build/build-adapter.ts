/**
 * BuildAdapter — LC2 (task #872).
 *
 * DomainAdapter for the `build` domain / `BUILD_RUN` task type. Wraps a
 * pluggable `runner` callback (default: spawn `vite build`) so unit tests
 * can inject a deterministic stub without ever touching the filesystem.
 *
 * Responsibilities:
 *   - Validate the payload shape.
 *   - Invoke the runner; capture exit code + bundle size + duration.
 *   - Translate the runner outcome into a structured AdapterResult with
 *     namespaced JSON log lines (`build.run.started/completed/failed`).
 *   - Surface `cost_usd` (build-minutes consumed) and `latency_ms` on the
 *     output so the orchestrator persists them on the task row.
 *
 * Adapters MUST NOT mutate execution_tasks status — the orchestrator
 * owns the lifecycle. Rollback strategy is `none`: a build is a pure
 * read of the source tree producing artifacts in a scratch directory;
 * nothing in the system of record changes.
 */

import type {
  AdapterResult,
  DomainAdapter,
  ExecutionContext,
} from "../../types.ts";
import {
  BUILD_DOMAIN,
  BUILD_ERROR_CODES,
  BUILD_EVENTS,
  BUILD_TASK_TYPES,
  type BuildRunPayload,
  type BuildRunResult,
  type BuildRunnerResult,
} from "./types.ts";

export type BuildRunner = (args: {
  command: string;
  workspace: string;
  mode: string | null;
  taskId: string;
}) => Promise<BuildRunnerResult>;

export interface BuildAdapterDeps {
  /** Defaults to a Deno.Command-based runner when omitted. */
  runner?: BuildRunner;
  /** Default workspace if payload.workspace is missing. */
  defaultWorkspace?: string;
  /** Default build command (default: `vite build`). */
  defaultCommand?: string;
}

function jsonLog(event: string, fields: Record<string, unknown>): string {
  return JSON.stringify({ event, ts: new Date().toISOString(), ...fields });
}

function defaultRunner(): BuildRunner {
  return async () => {
    throw new Error(
      "BuildAdapter: no runner provided. The default Deno.Command runner is " +
        "intentionally not wired in this layer — bootstrap from the edge " +
        "function (or test) and pass an explicit `runner`.",
    );
  };
}

export function createBuildAdapter(deps: BuildAdapterDeps = {}): DomainAdapter {
  const runner = deps.runner ?? defaultRunner();
  const defaultWorkspace = deps.defaultWorkspace ?? ".";
  const defaultCommand = deps.defaultCommand ?? "vite build";

  return {
    domain: BUILD_DOMAIN,
    taskType: BUILD_TASK_TYPES.RUN,
    rollback_strategy: "none",

    agent: {
      slug: "build.run",
      version: "1.0.0",
      kind: "code.tool",
      displayName: "Build Runner (Vite)",
      ownerTeam: "platform-dev",
      policyProfile: "dev-default",
      metadata: {
        description:
          "Runs `vite build` in a scratch workspace, captures structured logs, " +
          "bundle size and build-minutes cost.",
        rollback_strategy: "none",
      },
    },

    getLockKey(task) {
      return `build:${task.id}`;
    },

    getIdempotencyKey(task) {
      return task.idempotency_key ?? null;
    },

    async execute(ctx: ExecutionContext): Promise<AdapterResult> {
      const { task } = ctx;
      const payload = (task.payload ?? {}) as BuildRunPayload;

      if (payload && typeof payload !== "object") {
        return {
          success: false,
          errorCode: BUILD_ERROR_CODES.INVALID_PAYLOAD,
          errorMessage: "build.run payload must be an object",
          logs: [jsonLog(BUILD_EVENTS.FAILED, {
            task_id: task.id,
            reason: "invalid_payload",
          })],
        };
      }

      const command = payload.command?.trim() || defaultCommand;
      const workspace = payload.workspace?.trim() || defaultWorkspace;
      const mode = payload.mode?.trim() || null;
      const label = payload.label?.trim() || null;

      const startedAt = Date.now();
      const startLog = jsonLog(BUILD_EVENTS.STARTED, {
        task_id: task.id,
        command,
        workspace,
        mode,
        label,
      });

      let runnerResult: BuildRunnerResult;
      try {
        runnerResult = await runner({ command, workspace, mode, taskId: task.id });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          success: false,
          errorCode: BUILD_ERROR_CODES.RUNNER_THREW,
          errorMessage: `build runner threw: ${message}`,
          logs: [
            startLog,
            jsonLog(BUILD_EVENTS.FAILED, {
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
        workspace,
        mode,
        label,
        bundle_bytes: runnerResult.bundleBytes,
        asset_count: runnerResult.assets.length,
        duration_ms: durationMs,
        build_minutes: buildMinutes,
        exit_code: runnerResult.exitCode,
      };

      if (runnerResult.exitCode !== 0) {
        return {
          success: false,
          errorCode: BUILD_ERROR_CODES.BUILD_FAILED,
          errorMessage: `vite build exited with code ${runnerResult.exitCode}`,
          logs: [
            startLog,
            jsonLog(BUILD_EVENTS.FAILED, {
              ...baseFields,
              stderr_tail: runnerResult.stderrTail,
            }),
          ],
          actionsTaken: ["runner_invoked"],
          output: {
            ...runnerResult,
            buildMinutes,
            durationMs,
            status: "failed",
            cost_usd: buildMinutes,
            latency_ms: durationMs,
            command,
            mode,
            label,
          } satisfies BuildRunResult as unknown as Record<string, unknown>,
        };
      }

      const output: BuildRunResult = {
        ...runnerResult,
        buildMinutes,
        durationMs,
        status: "succeeded",
        cost_usd: buildMinutes,
        latency_ms: durationMs,
        command,
        mode,
        label,
      };

      return {
        success: true,
        output: output as unknown as Record<string, unknown>,
        logs: [
          startLog,
          jsonLog(BUILD_EVENTS.COMPLETED, baseFields),
        ],
        actionsTaken: ["runner_invoked", "bundle_measured"],
      };
    },
  };
}
