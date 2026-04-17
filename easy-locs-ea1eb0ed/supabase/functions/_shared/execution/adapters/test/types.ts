/**
 * Test adapter — domain constants and payload types (LC2, task #872).
 */

export const TEST_DOMAIN = "test";

export const TEST_TASK_TYPES = {
  RUN: "TEST_RUN",
} as const;

export type TestTaskType = (typeof TEST_TASK_TYPES)[keyof typeof TEST_TASK_TYPES];

export interface TestRunPayload {
  workspace?: string;
  /** Test command (default: `vitest run`). */
  command?: string;
  /** Optional vitest filter pattern. */
  pattern?: string;
  label?: string;
}

export interface TestRunnerResult {
  exitCode: number;
  passed: number;
  failed: number;
  skipped: number;
  /** Total test duration in milliseconds. */
  durationMs: number;
  /** Build-minutes consumed (durationMs / 60000). */
  buildMinutes: number;
  /** Optional coverage summary (line / statement / branch / function). */
  coverage: {
    lines: number | null;
    statements: number | null;
    branches: number | null;
    functions: number | null;
  };
  stdoutTail: string;
  stderrTail: string;
}

export interface TestRunResult extends TestRunnerResult {
  status: "succeeded" | "failed";
  cost_usd: number;
  latency_ms: number;
  command: string;
  pattern: string | null;
  label: string | null;
}

export const TEST_ERROR_CODES = {
  INVALID_PAYLOAD: "TEST_RUN_INVALID_PAYLOAD",
  TESTS_FAILED: "TEST_RUN_FAILED",
  RUNNER_THREW: "TEST_RUN_RUNNER_THREW",
} as const;

export type TestErrorCode =
  (typeof TEST_ERROR_CODES)[keyof typeof TEST_ERROR_CODES];

export const TEST_EVENTS = {
  STARTED: "test.run.started",
  COMPLETED: "test.run.completed",
  FAILED: "test.run.failed",
} as const;
