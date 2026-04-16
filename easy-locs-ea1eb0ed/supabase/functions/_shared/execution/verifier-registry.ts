/**
 * VerifierRegistry — Phase-2 verification routing table (task #753).
 *
 * Maps a (domain, task_type) pair to exactly one TaskVerifier. The registry
 * runs in parallel to the AdapterRegistry: every adapter that is registered
 * in the orchestrator MUST also register a verifier here, otherwise its
 * tasks will be blocked with `error_code = NO_VERIFIER` by
 * TaskVerificationService.
 *
 * The registry is intentionally strict: duplicate registration throws unless
 * `{ overwrite: true }` is passed. Unknown lookups return null — the
 * orchestrator translates that into a non-negotiable refusal.
 */

import type { ExecutionTask } from "./types.ts";

// ── Result types ─────────────────────────────────────────────────────────

export interface VerifierOk {
  ok: true;
  /** Optional context persisted alongside the success payload. */
  details?: Record<string, unknown>;
}

export interface VerifierMismatch {
  ok: false;
  /** Value the verifier expected to observe after the mutation. */
  expected: unknown;
  /** Value actually observed in the source of truth. */
  actual: unknown;
  /**
   * Dotted path inside the entity where the mismatch was observed
   * (e.g. `"status"`, `"visibility.public"`). Used for structured diffs.
   */
  mismatchPath: string;
  /** Optional free-form hints (ids, fetched row, reason, …). */
  details?: Record<string, unknown>;
}

export type VerifierResult = VerifierOk | VerifierMismatch;

// ── Contract ─────────────────────────────────────────────────────────────

/**
 * A TaskVerifier is bound to one (domain, taskType). After the orchestrator's
 * adapter reports success, the verifier reads the real source of truth and
 * confirms (or refutes) that the expected state was actually reached.
 *
 * `executionResult` is the JSONB payload the adapter returned.
 */
export interface TaskVerifier<
  TPayload = Record<string, unknown>,
  TExpected = unknown,
> {
  readonly domain: string;
  readonly taskType: string;
  verify(
    task: ExecutionTask,
    executionResult: Record<string, unknown>,
  ): Promise<VerifierResult>;
  // Phantom-type slots so adapters can carry precise types into the registry
  // without TS widening them away at the call site.
  readonly _payloadBrand?: TPayload;
  readonly _expectedBrand?: TExpected;
}

// ── Registry ─────────────────────────────────────────────────────────────

export class VerifierRegistry {
  private readonly verifiers = new Map<string, TaskVerifier>();

  private static keyOf(domain: string, taskType: string): string {
    return `${domain.toLowerCase()}::${taskType.toUpperCase()}`;
  }

  register(verifier: TaskVerifier, opts?: { overwrite?: boolean }): void {
    if (!verifier.domain || !verifier.taskType) {
      throw new Error(
        "VerifierRegistry.register: verifier must declare both `domain` and `taskType`",
      );
    }
    const key = VerifierRegistry.keyOf(verifier.domain, verifier.taskType);
    if (this.verifiers.has(key) && !opts?.overwrite) {
      throw new Error(
        `VerifierRegistry: verifier already registered for ${key}. ` +
          `Pass { overwrite: true } if this is intentional.`,
      );
    }
    this.verifiers.set(key, verifier);
  }

  get(domain: string, taskType: string): TaskVerifier | null {
    return this.verifiers.get(VerifierRegistry.keyOf(domain, taskType)) ?? null;
  }

  has(domain: string, taskType: string): boolean {
    return this.verifiers.has(VerifierRegistry.keyOf(domain, taskType));
  }

  size(): number {
    return this.verifiers.size;
  }

  list(): Array<{ domain: string; taskType: string }> {
    return Array.from(this.verifiers.values()).map((v) => ({
      domain: v.domain,
      taskType: v.taskType,
    }));
  }

  clear(): void {
    this.verifiers.clear();
  }
}

/** Process-wide singleton — verifiers auto-register against this instance. */
export const globalVerifierRegistry = new VerifierRegistry();
