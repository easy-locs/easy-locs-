/**
 * Regression: persistence layer MUST hydrate the L3 contract-guard fields
 * (`pre_rollback_status`, `error_code`, `execution_result`) from the DB
 * row. Forgetting any of these silently bypasses the orchestrator's
 * succeeded-origin rollback guard in production (#811 architect feedback).
 */
import { describe, it, expect } from "vitest";
import { toExecutionTask } from "../../supabase/functions/_shared/execution/persistence.ts";

describe("persistence.toExecutionTask — L3 rollback fields", () => {
  it("hydrates pre_rollback_status, error_code, execution_result from the row", () => {
    const row = {
      id: "00000000-0000-0000-0000-000000000001",
      type: "PUBLISH_LISTING",
      domain: "marketplace",
      risk_level: "MUTATING",
      status: "rolling_back",
      payload: { listing_id: "abc" },
      attempt_count: 1,
      max_attempts: 3,
      requested_by: "operator",
      previous_state: { snap: "ok" },
      rollback_result: null,
      rollback_reason: "operator opt-in",
      rollback_strategy: "manual",
      pre_rollback_status: "succeeded",
      error_code: "PRIOR_ERR",
      execution_result: { previous_state: { legacy: true } },
    };
    const task = toExecutionTask(row);
    expect(task.pre_rollback_status).toBe("succeeded");
    expect(task.error_code).toBe("PRIOR_ERR");
    expect(task.execution_result).toEqual({ previous_state: { legacy: true } });
    expect(task.rollback_strategy).toBe("manual");
  });

  it("defaults pre_rollback_status to null and rollback_strategy to 'none' (fail-closed)", () => {
    const row = {
      id: "00000000-0000-0000-0000-000000000002",
      type: "ANY",
      domain: "any",
      risk_level: "SAFE",
      status: "queued",
      payload: {},
      attempt_count: 0,
      max_attempts: 3,
      requested_by: "system",
    };
    const task = toExecutionTask(row);
    expect(task.pre_rollback_status).toBeNull();
    expect(task.error_code).toBeNull();
    expect(task.execution_result).toBeNull();
    expect(task.rollback_strategy).toBe("none");
  });
});
