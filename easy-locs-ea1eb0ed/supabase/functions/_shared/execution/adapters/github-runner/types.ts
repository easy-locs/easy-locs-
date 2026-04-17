/**
 * GitHub Runner Adapter — domain constants and payload types (Phase 1, #816).
 */

export const GITHUB_RUNNER_DOMAIN = "github-runner";

export const GITHUB_RUNNER_TASK_TYPES = {
  SMOKE_NOOP: "SMOKE_NOOP",
} as const;

export type GithubRunnerTaskType =
  (typeof GITHUB_RUNNER_TASK_TYPES)[keyof typeof GITHUB_RUNNER_TASK_TYPES];

/** Payload accepted by the SMOKE_NOOP task type. All fields optional. */
export interface SmokeNoopPayload {
  /** Free-text label to embed in the PR title/body for traceability. */
  label?: string;
}

export const GITHUB_RUNNER_ERROR_CODES = {
  MISSING_SECRETS: "GITHUB_RUNNER_MISSING_SECRETS",
  DISPATCH_FAILED: "GITHUB_RUNNER_DISPATCH_FAILED",
  INVALID_PAYLOAD: "GITHUB_RUNNER_INVALID_PAYLOAD",
} as const;

export type GithubRunnerErrorCode =
  (typeof GITHUB_RUNNER_ERROR_CODES)[keyof typeof GITHUB_RUNNER_ERROR_CODES];

/** Shape written to execution_tasks.execution_result on a successful dispatch. */
export interface GithubRunnerDispatchResult {
  dispatched: true;
  runner: "github";
  task_type: GithubRunnerTaskType;
  external_run_url: string | null;
  label?: string;
}
