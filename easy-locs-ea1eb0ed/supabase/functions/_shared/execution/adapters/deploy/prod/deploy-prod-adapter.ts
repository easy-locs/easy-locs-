/**
 * DeployProdAdapter — LC2 (task #872).
 *
 * Triggers a Vercel **production** deployment. Submits a fail-closed
 * approval gate inside the adapter itself: even if a misconfigured
 * dispatcher slips a deploy.prod task into `queued` without an
 * `approved_by`, this adapter refuses to call Vercel and surfaces
 * `DEPLOY_PROD_NOT_APPROVED`. The orchestrator already enforces
 * approval based on `requires_approval` + the `dev-sensitive` policy
 * profile (LC5); this is a defense-in-depth check.
 *
 * Rollback strategy is `manual` (operator can re-promote a previous
 * production deployment) but no `rollback` handler is wired here —
 * promotion is handled out-of-band by LC6.
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

export type DeployProdRunner = (args: {
  target: "production";
  project: string;
  gitRef: string | null;
  team: string | null;
  label: string | null;
  taskId: string;
}) => Promise<DeployRunnerResult>;

export interface DeployProdAdapterDeps {
  runner?: DeployProdRunner;
  defaultTeam?: string | null;
  keyEnv?: string;
}

function jsonLog(event: string, fields: Record<string, unknown>): string {
  return JSON.stringify({ event, ts: new Date().toISOString(), ...fields });
}

function defaultRunner(): DeployProdRunner {
  return async () => {
    throw new Error(
      "DeployProdAdapter: no runner provided. Bootstrap from the edge " +
        "function (or test) and pass an explicit `runner`.",
    );
  };
}

export function createDeployProdAdapter(
  deps: DeployProdAdapterDeps = {},
): DomainAdapter {
  const runner = deps.runner ?? defaultRunner();
  const defaultTeam = deps.defaultTeam ?? null;
  const keyEnv = deps.keyEnv ?? "VERCEL_ACCESS_TOKEN";

  return {
    domain: DEPLOY_DOMAIN,
    taskType: DEPLOY_TASK_TYPES.PROD,
    rollback_strategy: "none",

    agent: {
      slug: "deploy.prod",
      version: "1.0.0",
      kind: "code.tool",
      displayName: "Deploy (Vercel production)",
      ownerTeam: "platform-dev",
      // LC5: dev-sensitive forces pending_review through the policy gate.
      policyProfile: "dev-sensitive",
      metadata: {
        description:
          "Triggers a Vercel production deployment. Always requires admin " +
          "approval via the dev-sensitive policy profile.",
        rollback_strategy: "none",
        sensitive: true,
        router: {
          primary: { provider: "vercel", key_env: keyEnv },
        },
      },
    },

    getLockKey(task) {
      const payload = (task.payload ?? {}) as DeployPayload;
      const project = payload.project ?? "default";
      return `deploy:prod:${project}`;
    },

    getIdempotencyKey(task) {
      return task.idempotency_key ?? null;
    },

    async execute(ctx: ExecutionContext): Promise<AdapterResult> {
      const { task } = ctx;

      // Defense-in-depth: never call Vercel without an approval. The
      // orchestrator owns the policy gate; this is a redundant guard so
      // a misrouted dispatch cannot ship code to production.
      if (!task.approved_by) {
        return {
          success: false,
          errorCode: DEPLOY_ERROR_CODES.PROD_NOT_APPROVED,
          errorMessage:
            "deploy.prod refused: task has no approved_by; dev-sensitive " +
            "policy requires explicit admin approval before dispatch.",
          logs: [jsonLog(DEPLOY_EVENTS.PROD_REJECTED, {
            task_id: task.id,
            reason: "no_approval",
            requires_approval: task.requires_approval,
            approval_policy: task.approval_policy,
          })],
          actionsTaken: [],
        };
      }

      const payload = (task.payload ?? {}) as DeployPayload;
      if (!payload || typeof payload !== "object" ||
          !payload.project || typeof payload.project !== "string") {
        return {
          success: false,
          errorCode: DEPLOY_ERROR_CODES.INVALID_PAYLOAD,
          errorMessage: "deploy.prod payload must include a project slug",
          logs: [jsonLog(DEPLOY_EVENTS.PROD_FAILED, {
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
      const startLog = jsonLog(DEPLOY_EVENTS.PROD_STARTED, {
        task_id: task.id,
        project,
        git_ref: gitRef,
        team,
        label,
        approved_by: task.approved_by,
      });

      let runnerResult: DeployRunnerResult;
      try {
        runnerResult = await runner({
          target: "production",
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
          errorMessage: `vercel prod runner threw: ${message}`,
          logs: [
            startLog,
            jsonLog(DEPLOY_EVENTS.PROD_FAILED, {
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
        approved_by: task.approved_by,
      };

      const output: DeployResult = {
        ...runnerResult,
        durationMs,
        buildMinutes,
        target: "production",
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
          logs: [startLog, jsonLog(DEPLOY_EVENTS.PROD_FAILED, baseFields)],
          actionsTaken: ["vercel_dispatched"],
          output: output as unknown as Record<string, unknown>,
        };
      }

      return {
        success: true,
        output: output as unknown as Record<string, unknown>,
        logs: [startLog, jsonLog(DEPLOY_EVENTS.PROD_COMPLETED, baseFields)],
        actionsTaken: ["vercel_dispatched", "production_promoted"],
      };
    },
  };
}
