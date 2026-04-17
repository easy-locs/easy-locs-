/**
 * DeployPreviewAdapter — LC2 (task #872).
 *
 * Triggers a Vercel preview deployment via the `deploy.preview` task type.
 * The Vercel call itself is encapsulated behind a `runner` callback so
 * tests can inject a deterministic stub. Edge-function bootstrap wires
 * the real Vercel REST runner, reading the access token from the
 * `metadata.router.primary.key_env` env variable referenced in the agent
 * config — never from a hard-coded secret string.
 *
 * Rollback strategy is `manual`: a preview can be deleted via the Vercel
 * API but we don't auto-delete on failure (keeps debugging artifacts).
 */

import type {
  AdapterResult,
  DomainAdapter,
  ExecutionContext,
} from "../../../types.ts";
import {
  DEPLOY_DOMAIN,
  DEPLOY_ERROR_CODES,
  DEPLOY_EVENTS,
  DEPLOY_TASK_TYPES,
  type DeployPayload,
  type DeployResult,
  type DeployRunnerResult,
} from "../types.ts";

export type DeployRunner = (args: {
  target: "preview";
  project: string;
  gitRef: string | null;
  team: string | null;
  label: string | null;
  taskId: string;
}) => Promise<DeployRunnerResult>;

export interface DeployPreviewAdapterDeps {
  runner?: DeployRunner;
  /** Default Vercel team if payload.team is missing. */
  defaultTeam?: string | null;
  /**
   * Name of the env var holding the Vercel access token. The adapter
   * itself never reads the token — the bootstrap wires the runner with
   * it. Stored on agent metadata for audit (router.primary.key_env).
   */
  keyEnv?: string;
}

function jsonLog(event: string, fields: Record<string, unknown>): string {
  return JSON.stringify({ event, ts: new Date().toISOString(), ...fields });
}

function defaultRunner(): DeployRunner {
  return async () => {
    throw new Error(
      "DeployPreviewAdapter: no runner provided. Bootstrap from the edge " +
        "function (or test) and pass an explicit `runner`.",
    );
  };
}

export function createDeployPreviewAdapter(
  deps: DeployPreviewAdapterDeps = {},
): DomainAdapter {
  const runner = deps.runner ?? defaultRunner();
  const defaultTeam = deps.defaultTeam ?? null;
  const keyEnv = deps.keyEnv ?? "VERCEL_ACCESS_TOKEN";

  return {
    domain: DEPLOY_DOMAIN,
    taskType: DEPLOY_TASK_TYPES.PREVIEW,
    rollback_strategy: "none",

    agent: {
      slug: "deploy.preview",
      version: "1.0.0",
      kind: "code.tool",
      displayName: "Deploy (Vercel preview)",
      ownerTeam: "platform-dev",
      policyProfile: "dev-default",
      metadata: {
        description:
          "Triggers a Vercel preview deployment, captures URL + status.",
        rollback_strategy: "none",
        router: {
          primary: { provider: "vercel", key_env: keyEnv },
        },
      },
    },

    getLockKey(task) {
      const payload = (task.payload ?? {}) as DeployPayload;
      const project = payload.project ?? "default";
      return `deploy:preview:${project}`;
    },

    getIdempotencyKey(task) {
      return task.idempotency_key ?? null;
    },

    async execute(ctx: ExecutionContext): Promise<AdapterResult> {
      const { task } = ctx;
      const payload = (task.payload ?? {}) as DeployPayload;

      if (!payload || typeof payload !== "object" ||
          !payload.project || typeof payload.project !== "string") {
        return {
          success: false,
          errorCode: DEPLOY_ERROR_CODES.INVALID_PAYLOAD,
          errorMessage: "deploy.preview payload must include a project slug",
          logs: [jsonLog(DEPLOY_EVENTS.PREVIEW_FAILED, {
            task_id: task.id,
            reason: "invalid_payload",
          })],
        };
      }

      const project = payload.project;
      const gitRef = payload.gitRef?.trim() || null;
      const label = payload.label?.trim() || null;
      const team = payload.team?.trim() || defaultTeam;

      const startedAt = Date.now();
      const startLog = jsonLog(DEPLOY_EVENTS.PREVIEW_STARTED, {
        task_id: task.id,
        project,
        git_ref: gitRef,
        team,
        label,
      });

      let runnerResult: DeployRunnerResult;
      try {
        runnerResult = await runner({
          target: "preview",
          project,
          gitRef,
          team,
          label,
          taskId: task.id,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          success: false,
          errorCode: DEPLOY_ERROR_CODES.RUNNER_THREW,
          errorMessage: `vercel preview runner threw: ${message}`,
          logs: [
            startLog,
            jsonLog(DEPLOY_EVENTS.PREVIEW_FAILED, {
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

      const okStatuses = new Set(["READY", "BUILDING", "QUEUED"]);
      const dispatchedOk = okStatuses.has(runnerResult.status);

      const baseFields = {
        task_id: task.id,
        project,
        deployment_id: runnerResult.deploymentId,
        url: runnerResult.url,
        status: runnerResult.status,
        duration_ms: durationMs,
        build_minutes: buildMinutes,
      };

      const output: DeployResult = {
        ...runnerResult,
        durationMs,
        buildMinutes,
        target: "preview",
        project,
        gitRef,
        label,
        status_lifecycle: dispatchedOk ? "succeeded" : "failed",
        cost_usd: buildMinutes,
        latency_ms: durationMs,
      };

      if (!dispatchedOk) {
        return {
          success: false,
          errorCode: DEPLOY_ERROR_CODES.DISPATCH_FAILED,
          errorMessage: `vercel returned status ${runnerResult.status}`,
          logs: [startLog, jsonLog(DEPLOY_EVENTS.PREVIEW_FAILED, baseFields)],
          actionsTaken: ["vercel_dispatched"],
          output: output as unknown as Record<string, unknown>,
        };
      }

      return {
        success: true,
        output: output as unknown as Record<string, unknown>,
        logs: [startLog, jsonLog(DEPLOY_EVENTS.PREVIEW_COMPLETED, baseFields)],
        actionsTaken: ["vercel_dispatched", "url_captured"],
      };
    },
  };
}
