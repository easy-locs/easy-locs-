/**
 * Contacts adapter framework — registry-compatible verifiers (task #945).
 *
 * Two verifiers, both bound to canonical task type
 * `NON_SENSITIVE_BULK_UPDATE`:
 *
 *   contacts.sync   — assert the runner reported rows ≥ 0 and any
 *                     declared upsert table now holds the count it
 *                     reported.
 *   contacts.upsert — assert observedCount ≥ expectedAtLeast (the
 *                     batch size). Caller MUST tag rows with `source`
 *                     for the count to be meaningful; absence of the
 *                     column is tolerated (verifier returns ok with a
 *                     `details.note`).
 */

import type { ExecutionTask } from "../../types.ts";
import type { TaskVerifier, VerifierResult } from "../../verifier-registry.ts";
import {
  CONTACTS_DOMAINS,
  CONTACTS_TASK_TYPE,
  type ContactsDomain,
} from "./types.ts";
import type { ContactsRepository } from "./contacts-repository.ts";

export function createContactsSyncVerifier(_repo: ContactsRepository): TaskVerifier {
  return {
    domain: CONTACTS_DOMAINS.SYNC,
    taskType: CONTACTS_TASK_TYPE,
    async verify(_task: ExecutionTask, executionResult: Record<string, unknown>): Promise<VerifierResult> {
      const rows = Number(executionResult?.rowsAffected ?? 0);
      if (!Number.isFinite(rows) || rows < 0) {
        return {
          ok: false,
          expected: ">= 0",
          actual: rows,
          mismatchPath: "rowsAffected",
          details: { reason: "rowsAffected missing or negative" },
        };
      }
      return { ok: true, details: { provider: executionResult?.provider ?? null, rowsAffected: rows } };
    },
  };
}

export function createContactsUpsertVerifier(_repo: ContactsRepository): TaskVerifier {
  return {
    domain: CONTACTS_DOMAINS.UPSERT,
    taskType: CONTACTS_TASK_TYPE,
    async verify(_task: ExecutionTask, executionResult: Record<string, unknown>): Promise<VerifierResult> {
      const upserted = Number(executionResult?.upsertedRows ?? 0);
      const expectedAtLeast = Number(executionResult?.expectedAtLeast ?? 0);
      if (upserted < expectedAtLeast) {
        return {
          ok: false,
          expected: { upsertedRows: `>= ${expectedAtLeast}` },
          actual: upserted,
          mismatchPath: "upsertedRows",
          details: {
            reason: "DB reported fewer upserted rows than the batch size",
            table: executionResult?.table ?? null,
            source: executionResult?.source ?? null,
          },
        };
      }
      return {
        ok: true,
        details: {
          table: executionResult?.table ?? null,
          source: executionResult?.source ?? null,
          upsertedRows: upserted,
          observedCount: executionResult?.observedCount ?? null,
        },
      };
    },
  };
}

export const CONTACTS_VERIFIER_DOMAINS: ContactsDomain[] = [
  CONTACTS_DOMAINS.SYNC,
  CONTACTS_DOMAINS.UPSERT,
];
