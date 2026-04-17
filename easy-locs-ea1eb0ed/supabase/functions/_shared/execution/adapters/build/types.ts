/**
 * Build adapter — domain constants and payload types (LC2, task #872).
 *
 * Wraps `vite build` and similar build commands behind the canonical
 * DomainAdapter contract so dev.* agents can request a deterministic
 * compile step the same way they request any other governed action.
 */

export const BUILD_DOMAIN = "build";

export const BUILD_TASK_TYPES = {
  RUN: "BUILD_RUN",
} as const;

export type BuildTaskType = (typeof BUILD_TASK_TYPES)[keyof typeof BUILD_TASK_TYPES];

export interface BuildRunPayload {
  /** Workspace root passed to the runner; defaults to repo root. */
  workspace?: string;
  /** Build command (default: `vite build`). */
  command?: string;
  /** Free-form build mode label (production / staging / preview…). */
  mode?: string;
  /** Free-text label propagated to logs for traceability. */
  label?: string;
}

/** Output a runner produces; structured so a verifier can inspect it. */
export interface BuildRunnerResult {
  exitCode: number;
  /** Total bundle size in bytes (sum of all emitted assets). */
  bundleBytes: number;
  /** Asset-level breakdown (path → bytes). */
  assets: Array<{ path: string; bytes: number }>;
  /** Wall-clock duration of the build, milliseconds. */
  durationMs: number;
  /** Build minutes consumed (durationMs / 60000, rounded to 4 dp). */
  buildMinutes: number;
  /** Stdout / stderr captured for the audit log. */
  stdoutTail: string;
  stderrTail: string;
}

/** Shape persisted onto execution_tasks.execution_result. */
export interface BuildRunResult extends BuildRunnerResult {
  status: "succeeded" | "failed";
  /** Mirrored to execution_tasks.cost_usd by the orchestrator. */
  cost_usd: number;
  /** Mirrored to execution_tasks.latency_ms by the orchestrator. */
  latency_ms: number;
  command: string;
  mode: string | null;
  label: string | null;
}

export const BUILD_ERROR_CODES = {
  INVALID_PAYLOAD: "BUILD_RUN_INVALID_PAYLOAD",
  BUILD_FAILED: "BUILD_RUN_FAILED",
  RUNNER_THREW: "BUILD_RUN_RUNNER_THREW",
} as const;

export type BuildErrorCode =
  (typeof BUILD_ERROR_CODES)[keyof typeof BUILD_ERROR_CODES];

/**
 * Structured event names emitted via AdapterResult.logs (one JSON-encoded
 * line per event). Keeps log parsers stable.
 */
export const BUILD_EVENTS = {
  STARTED: "build.run.started",
  COMPLETED: "build.run.completed",
  FAILED: "build.run.failed",
} as const;
