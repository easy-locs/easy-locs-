/**
 * Deploy adapters — shared domain constants and payload types
 * (LC2, task #872).
 *
 * Covers both `deploy.preview` and `deploy.prod`. Two distinct task types
 * keep the policy / approval surface explicit (deploy.prod requires
 * `dev-sensitive` approval; deploy.preview does not).
 */

export const DEPLOY_DOMAIN = "deploy";

export const DEPLOY_TASK_TYPES = {
  PREVIEW: "DEPLOY_PREVIEW",
  PROD: "DEPLOY_PROD",
} as const;

export type DeployTaskType =
  (typeof DEPLOY_TASK_TYPES)[keyof typeof DEPLOY_TASK_TYPES];

export interface DeployPayload {
  /** Vercel project slug or ID. */
  project: string;
  /** Git ref (commit SHA or branch). */
  gitRef?: string;
  /** Free-text label propagated to logs / Vercel deployment metadata. */
  label?: string;
  /** Optional team override; defaults to env. */
  team?: string;
}

export type DeployTarget = "preview" | "production";

export interface DeployRunnerResult {
  deploymentId: string;
  url: string;
  status: "READY" | "BUILDING" | "ERROR" | "QUEUED" | "CANCELED" | string;
  /** Wall-clock duration of the API dispatch + initial poll. */
  durationMs: number;
  /** Build minutes (used for cost). */
  buildMinutes: number;
}

export interface DeployResult extends DeployRunnerResult {
  status_lifecycle: "succeeded" | "failed";
  target: DeployTarget;
  project: string;
  gitRef: string | null;
  label: string | null;
  cost_usd: number;
  latency_ms: number;
}

export const DEPLOY_ERROR_CODES = {
  INVALID_PAYLOAD: "DEPLOY_INVALID_PAYLOAD",
  MISSING_SECRETS: "DEPLOY_MISSING_SECRETS",
  DISPATCH_FAILED: "DEPLOY_DISPATCH_FAILED",
  RUNNER_THREW: "DEPLOY_RUNNER_THREW",
  PROD_NOT_APPROVED: "DEPLOY_PROD_NOT_APPROVED",
} as const;

export type DeployErrorCode =
  (typeof DEPLOY_ERROR_CODES)[keyof typeof DEPLOY_ERROR_CODES];

export const DEPLOY_EVENTS = {
  PREVIEW_STARTED: "deploy.preview.started",
  PREVIEW_COMPLETED: "deploy.preview.completed",
  PREVIEW_FAILED: "deploy.preview.failed",
  PROD_STARTED: "deploy.prod.started",
  PROD_COMPLETED: "deploy.prod.completed",
  PROD_FAILED: "deploy.prod.failed",
  PROD_REJECTED: "deploy.prod.rejected_no_approval",
} as const;
