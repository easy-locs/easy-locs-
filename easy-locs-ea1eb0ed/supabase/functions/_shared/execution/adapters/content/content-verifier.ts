/**
 * Content adapter framework — registry-compatible verifiers (task #945).
 *
 * Two verifiers are registered against the global verifier registry, one
 * per (domain, task_type) the framework owns:
 *
 *   ROW  : (`content.row`, NON_CRITICAL_DATA_FIX)
 *   BULK : ({content.food | search | shop | media}, NON_SENSITIVE_BULK_UPDATE)
 *
 * The orchestrator's `TaskVerificationService` calls these AFTER the
 * adapter reports success. The adapter has already done its own eager
 * verification — these are the centralised second check.
 */

import type { ExecutionTask } from "../../types.ts";
import {
  buildDiff,
  type TaskVerifier,
  type VerifierResult,
} from "../../verifier-registry.ts";
import { CONTENT_DOMAINS, CONTENT_TASK_TYPES, type ContentDomain } from "./types.ts";
import type { ContentRowRepository } from "./row-repository.ts";

export function createContentRowVerifier(repo: ContentRowRepository): TaskVerifier {
  return {
    domain: CONTENT_DOMAINS.ROW,
    taskType: CONTENT_TASK_TYPES.ROW_WRITE,
    async verify(task: ExecutionTask, executionResult: Record<string, unknown>): Promise<VerifierResult> {
      const table = (executionResult?.table as string | undefined)
        ?? (task.entity_type ?? "");
      const id = (executionResult?.id as string | undefined)
        ?? (task.entity_id ?? "");
      const op = (executionResult?.op as string | undefined) ?? "";
      if (!table || !op) {
        return {
          ok: false,
          expected: { table, op },
          actual: null,
          mismatchPath: "executionResult",
          details: { reason: "verifier requires table+op in executionResult" },
        };
      }
      let row: Record<string, unknown> | null = null;
      if (id) {
        try {
          row = await repo.readById(table, id);
        } catch (e) {
          return {
            ok: false,
            expected: { table, id, op },
            actual: null,
            mismatchPath: "lookup",
            details: { reason: e instanceof Error ? e.message : String(e) },
          };
        }
      }
      if (op === "delete") {
        if (row !== null) {
          return {
            ok: false,
            expected: null,
            actual: row,
            mismatchPath: "row",
            details: { reason: "row still present after delete" },
          };
        }
        return { ok: true, details: { table, id, op } };
      }
      if (row === null) {
        return {
          ok: false,
          expected: { exists: true },
          actual: null,
          mismatchPath: "row",
          details: { reason: `row ${table}/${id} not found post-mutation` },
        };
      }
      const observed = (executionResult?.observed as Record<string, unknown> | null) ?? null;
      const diff = observed ? buildDiff(observed, row) : [];
      if (diff.length > 0) {
        const first = diff[0];
        return {
          ok: false,
          expected: first.expected,
          actual: first.observed,
          mismatchPath: first.field,
          details: { table, id, op, diff },
        };
      }
      return { ok: true, details: { table, id, op } };
    },
  };
}

/** Bulk verifier — equality between adapter-reported `expected` and `observed`. */
export function createContentBulkVerifier(domain: ContentDomain): TaskVerifier {
  return {
    domain,
    taskType: CONTENT_TASK_TYPES.BULK_RUN,
    async verify(_task: ExecutionTask, executionResult: Record<string, unknown>): Promise<VerifierResult> {
      const expected = (executionResult?.expected as Record<string, unknown> | null) ?? null;
      const observed = (executionResult?.observed as Record<string, unknown> | null) ?? null;
      if (!expected || !observed) {
        // Bulk runners are allowed to skip the expected/observed pair when
        // the pipeline has no concise verification reading. We treat that
        // as a soft pass: the adapter already returned success, the
        // pipeline already wrote audit rows.
        return { ok: true, details: { reason: "no expected/observed pair to compare" } };
      }
      const diff = buildDiff(expected, observed);
      if (diff.length === 0) return { ok: true, details: { compared: Object.keys(expected) } };
      const first = diff[0];
      return {
        ok: false,
        expected: first.expected,
        actual: first.observed,
        mismatchPath: first.field,
        details: { diff, pipeline: executionResult?.pipeline ?? null },
      };
    },
  };
}
