/**
 * Phase-2 Verification Layer — Task #753.
 *
 * Defines the generic `TaskVerifier` contract and the `VerifierRegistry`
 * parallel to the AdapterRegistry (phase-2 block 3). A verifier's sole job:
 * after an adapter reports success, confirm that the expected entity state
 * has actually been reached. Any adapter that does not register a verifier
 * for its `(domain, task_type)` pair will see its tasks blocked with
 * `error_code = NO_VERIFIER` — the system refuses un-verified success.
 *
 * See `VERIFICATION_LAYER.md` in this directory for the full contract.
 */

import type { ExecutionTaskRow } from "./types";

// ── Result types ─────────────────────────────────────────────────────────

export interface VerifierOk {
  ok: true;
  /** Optional adapter-supplied details persisted alongside the outcome. */
  details?: Record<string, unknown>;
}

export interface VerifierMismatch {
  ok: false;
  /** The value the verifier expected after the mutation. */
  expected: unknown;
  /** The value actually observed in the source of truth. */
  actual: unknown;
  /**
   * Dotted path inside the entity where the mismatch was observed (e.g.
   * `"status"`, `"visibility.public"`). Used for structured diffs.
   */
  mismatchPath: string;
  /** Optional free-form adapter context (reason hint, fetched row id, …). */
  details?: Record<string, unknown>;
}

export type VerifierResult = VerifierOk | VerifierMismatch;

// ── Verifier contract ────────────────────────────────────────────────────

/**
 * A `TaskVerifier` is bound to exactly one `(domain, taskType)` pair. The
 * orchestrator looks it up in the registry AFTER the adapter returns a
 * success signal. `executionResult` is the raw payload the adapter produced
 * (the same object the orchestrator would otherwise persist).
 */
export interface TaskVerifier<
  // Generics are carried for future-proofing; the verify signature keeps
  // runtime values as `Record<string, unknown>` to match how the orchestrator
  // loads tasks / execution results from JSONB columns.
  TPayload = Record<string, unknown>,
  TExpected = unknown,
> {
  readonly domain: string;
  readonly taskType: string;
  verify(
    task: ExecutionTaskRow,
    executionResult: Record<string, unknown>,
  ): Promise<VerifierResult>;
  // Phantom-type slots — purely to prevent TS from widening away TPayload /
  // TExpected when an adapter wires a typed verifier into the registry.
  readonly _payloadBrand?: TPayload;
  readonly _expectedBrand?: TExpected;
}

// ── Registry ─────────────────────────────────────────────────────────────

function registryKey(domain: string, taskType: string): string {
  return `${domain.trim().toLowerCase()}::${taskType.trim()}`;
}

export class VerifierRegistry {
  private readonly verifiers = new Map<string, TaskVerifier>();

  register(verifier: TaskVerifier): void {
    if (!verifier.domain || !verifier.taskType) {
      throw new Error(
        "VerifierRegistry.register: verifier must declare non-empty domain and taskType",
      );
    }
    const key = registryKey(verifier.domain, verifier.taskType);
    if (this.verifiers.has(key)) {
      throw new Error(
        `VerifierRegistry.register: a verifier is already registered for ${key}`,
      );
    }
    this.verifiers.set(key, verifier);
  }

  get(domain: string, taskType: string): TaskVerifier | null {
    return this.verifiers.get(registryKey(domain, taskType)) ?? null;
  }

  has(domain: string, taskType: string): boolean {
    return this.verifiers.has(registryKey(domain, taskType));
  }

  unregister(domain: string, taskType: string): boolean {
    return this.verifiers.delete(registryKey(domain, taskType));
  }

  /** Test-only helper — wipes every registered verifier. */
  clear(): void {
    this.verifiers.clear();
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
}

/** Process-wide singleton — mirrors the pattern used by AdapterRegistry. */
export const verifierRegistry = new VerifierRegistry();
