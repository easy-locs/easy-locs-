/**
 * code.edit adapter — Level-C primitive (LC1, task #871).
 *
 * Single DomainAdapter for `domain="code"`, `taskType="code.edit"`. The
 * adapter is the only sanctioned way for any Level-C build agent (planner,
 * builder, verifier) to mutate repo files. It enforces:
 *
 *   1. Sandboxed FS — every IO call goes through an injected `SandboxFs`
 *      whose default production binding spawns a Deno Worker with
 *      net/env/run permissions stripped and read/write scoped to the
 *      workspace root. Tests use `MemoryFs`.
 *   2. Path scope — relative-only, no "..", no absolute paths. Violations
 *      surface as CODE_ERROR_CODES.PATH_OUT_OF_SCOPE on the offending op.
 *   3. Diff budget — total unified-diff bytes per run capped at
 *      `payload.maxDiffBytes ?? agent.quotas.max_diff_bytes ??
 *      DEFAULT_DIFF_BUDGET_BYTES` (50 MB). Crossing the cap aborts the
 *      run with DIFF_BUDGET_EXCEEDED.
 *   4. Structured output — unified diff string + per-file checksum/size
 *      before/after + per-op result so reviewers can replay the run.
 *   5. rollback_strategy="none" — file edits are inverted by re-running
 *      `code.edit` with the inverse ops; LC6 owns that workflow. The
 *      adapter therefore declares no rollback handler.
 */

import type {
  AdapterResult,
  DomainAdapter,
  ExecutionContext,
  ExecutionTask,
} from "../../types.ts";
import {
  CODE_AGENT_SLUGS,
  CODE_CAPABILITIES,
  CODE_DOMAIN,
  CODE_ERROR_CODES,
  CODE_TASK_TYPES,
  DEFAULT_DIFF_BUDGET_BYTES,
  DEFAULT_OPS_PER_DAY,
  type CodeEditOp,
  type CodeEditPayload,
  type CodeEditResult,
  type FileChange,
  type OpResult,
  validateCodeEditPayload,
} from "./types.ts";
import {
  applyAnchoredReplace,
  buildUnifiedDiff,
} from "./diff.ts";
import {
  PathOutOfScopeError,
  type SandboxFs,
} from "./sandbox.ts";

/**
 * Workspace provider — given a payload's `workspace` id, returns a
 * SandboxFs scoped to it. The provider is responsible for cloning the
 * repo into a temp dir (production) or seeding an in-memory FS (tests).
 */
export interface WorkspaceProvider {
  acquire(workspace: string): Promise<SandboxFs>;
  /** Optional cleanup hook — production deletes the temp dir. */
  release?(fs: SandboxFs): Promise<void>;
}

/**
 * QuotaProvider — pulls the *live* `max_diff_bytes` for a given agent slug
 * from `system.agents.quotas` so DB-side changes take effect without
 * redeploy. Returns `null` when the agent / quota is unset; the adapter
 * then falls back to its compiled-in default. Implementations are free
 * to cache with a short TTL.
 */
export interface AgentQuotaProvider {
  getMaxDiffBytes(agentSlug: string): Promise<number | null>;
}

export interface CodeEditAdapterDeps {
  workspaces: WorkspaceProvider;
  /** Compiled-in fallback; defaults to DEFAULT_DIFF_BUDGET_BYTES. */
  maxDiffBytes?: number;
  /** Live DB-backed quota lookup. When absent, only the fallback applies. */
  agentQuotas?: AgentQuotaProvider;
  now?: () => Date;
}

const utf8Bytes = (s: string): number => new TextEncoder().encode(s).length;

async function sha256Hex(v: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(v));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function fileChange(
  path: string,
  before: string | null,
  after: string | null,
): Promise<FileChange> {
  return {
    path,
    beforeChecksum: before === null ? null : await sha256Hex(before),
    afterChecksum: after === null ? null : await sha256Hex(after),
    beforeBytes: before === null ? 0 : utf8Bytes(before),
    afterBytes: after === null ? 0 : utf8Bytes(after),
  };
}

interface RunState {
  diffBytes: number;
  diffParts: string[];
  changes: Map<string, { before: string | null; after: string | null }>;
  ops: OpResult[];
  budget: number;
}

function recordChange(
  state: RunState,
  path: string,
  before: string | null,
  after: string | null,
): void {
  const existing = state.changes.get(path);
  if (existing) {
    // Keep the original "before" but update the latest "after".
    state.changes.set(path, { before: existing.before, after });
  } else {
    state.changes.set(path, { before, after });
  }
}

async function runOperation(
  fs: SandboxFs,
  state: RunState,
  raw: CodeEditOp,
  index: number,
): Promise<OpResult> {
  try {
    switch (raw.op) {
      case "list_files": {
        const files = await fs.list(raw.path ?? "");
        return { index, op: "list_files", path: raw.path, ok: true, data: { files } };
      }
      case "read_file": {
        const content = await fs.read(raw.path);
        if (content === null) {
          return {
            index,
            op: "read_file",
            path: raw.path,
            ok: false,
            errorCode: CODE_ERROR_CODES.FILE_NOT_FOUND,
            errorMessage: `file not found: ${raw.path}`,
          };
        }
        return {
          index,
          op: "read_file",
          path: raw.path,
          ok: true,
          data: { content, bytes: utf8Bytes(content) },
        };
      }
      case "write_file": {
        const before = await fs.read(raw.path);
        const after = raw.content;
        const diff = buildUnifiedDiff(raw.path, before ?? "", after);
        const bytes = utf8Bytes(diff);
        if (state.diffBytes + bytes > state.budget) {
          return {
            index,
            op: "write_file",
            path: raw.path,
            ok: false,
            errorCode: CODE_ERROR_CODES.DIFF_BUDGET_EXCEEDED,
            errorMessage: `diff budget exceeded: ${state.diffBytes + bytes} > ${state.budget}`,
          };
        }
        await fs.write(raw.path, after);
        if (diff !== "") {
          state.diffBytes += bytes;
          state.diffParts.push(diff);
        }
        recordChange(state, raw.path, before, after);
        return {
          index,
          op: "write_file",
          path: raw.path,
          ok: true,
          data: { bytesWritten: utf8Bytes(after), diffBytes: bytes },
        };
      }
      case "apply_diff": {
        const before = await fs.read(raw.path);
        if (before === null) {
          return {
            index,
            op: "apply_diff",
            path: raw.path,
            ok: false,
            errorCode: CODE_ERROR_CODES.FILE_NOT_FOUND,
            errorMessage: `file not found: ${raw.path}`,
          };
        }
        const applied = applyAnchoredReplace(before, raw.find, raw.replace);
        if (!applied.ok) {
          return {
            index,
            op: "apply_diff",
            path: raw.path,
            ok: false,
            errorCode: CODE_ERROR_CODES.PATCH_NOT_APPLIED,
            errorMessage: `apply_diff: ${applied.reason}`,
          };
        }
        const after = applied.result;
        const diff = buildUnifiedDiff(raw.path, before, after);
        const bytes = utf8Bytes(diff);
        if (state.diffBytes + bytes > state.budget) {
          return {
            index,
            op: "apply_diff",
            path: raw.path,
            ok: false,
            errorCode: CODE_ERROR_CODES.DIFF_BUDGET_EXCEEDED,
            errorMessage: `diff budget exceeded: ${state.diffBytes + bytes} > ${state.budget}`,
          };
        }
        await fs.write(raw.path, after);
        if (diff !== "") {
          state.diffBytes += bytes;
          state.diffParts.push(diff);
        }
        recordChange(state, raw.path, before, after);
        return {
          index,
          op: "apply_diff",
          path: raw.path,
          ok: true,
          data: { diffBytes: bytes },
        };
      }
      default:
        return {
          index,
          op: (raw as CodeEditOp).op,
          ok: false,
          errorCode: CODE_ERROR_CODES.UNSUPPORTED_OP,
          errorMessage: `unsupported op: ${(raw as { op: string }).op}`,
        };
    }
  } catch (e) {
    if (e instanceof PathOutOfScopeError) {
      return {
        index,
        op: raw.op,
        path: (raw as { path?: string }).path,
        ok: false,
        errorCode: CODE_ERROR_CODES.PATH_OUT_OF_SCOPE,
        errorMessage: e.message,
      };
    }
    const message = e instanceof Error ? e.message : String(e);
    return {
      index,
      op: raw.op,
      path: (raw as { path?: string }).path,
      ok: false,
      errorCode: CODE_ERROR_CODES.SANDBOX_ERROR,
      errorMessage: message,
    };
  }
}

export function createCodeEditAdapter(deps: CodeEditAdapterDeps): DomainAdapter {
  const now = deps.now ?? (() => new Date());
  const adapterBudget = deps.maxDiffBytes ?? DEFAULT_DIFF_BUDGET_BYTES;

  return {
    domain: CODE_DOMAIN,
    taskType: CODE_TASK_TYPES.EDIT,

    agent: {
      slug: CODE_AGENT_SLUGS.CODE_EDIT,
      version: "1.0.0",
      kind: "code.tool",
      displayName: "Code Edit Tool",
      ownerTeam: "platform",
      policyProfile: "code-default",
      quotas: {
        max_runs_per_day: DEFAULT_OPS_PER_DAY,
        max_diff_bytes: DEFAULT_DIFF_BUDGET_BYTES,
      },
      metadata: {
        description:
          "Sandboxed code-edit primitive. Reads, writes, lists and patches " +
          "files inside an isolated workspace clone with no network or env " +
          "access; emits a structured unified diff for review.",
        capabilities: [...CODE_CAPABILITIES],
        rollback_strategy: "none",
      },
    },

    rollback_strategy: "none",

    getLockKey(task: ExecutionTask): string {
      const ws = (task.payload as Record<string, unknown> | null)?.workspace;
      const id = typeof ws === "string" && ws.trim() !== "" ? ws.trim() : task.id;
      return `code:workspace:${id}`;
    },

    getIdempotencyKey(task: ExecutionTask): string | null {
      const k = (task.idempotency_key ?? "").trim();
      return k === "" ? null : k;
    },

    async execute(ctx: ExecutionContext): Promise<AdapterResult> {
      const ts = () => now().toISOString();
      const logs: string[] = [];

      // Step 1: validate payload.
      const v = validateCodeEditPayload(ctx.task.payload);
      if (!v.ok || !v.data) {
        return {
          success: false,
          errorCode: CODE_ERROR_CODES.INVALID_PAYLOAD,
          errorMessage: v.reason ?? "payload validation failed",
          logs: [`[${ts()}] validate.failed: ${v.reason}`],
        };
      }
      const payload: CodeEditPayload = v.data;
      logs.push(`[${ts()}] validate.ok ops=${payload.operations.length} workspace=${payload.workspace}`);

      // Step 2: acquire the sandboxed workspace.
      let fs: SandboxFs;
      try {
        fs = await deps.workspaces.acquire(payload.workspace);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return {
          success: false,
          errorCode: CODE_ERROR_CODES.WORKSPACE_MISSING,
          errorMessage: `workspace acquire failed: ${msg}`,
          logs: [...logs, `[${ts()}] workspace.acquire_failed ${msg}`],
        };
      }
      logs.push(`[${ts()}] workspace.acquired id=${payload.workspace}`);

      // Step 3: resolve effective budget.
      // Precedence: payload override < agent.quotas.max_diff_bytes (live)
      // < adapter compiled-in default. We take the MIN so a tighter cap
      // anywhere in the chain wins. DB-side updates to `system.agents.quotas`
      // therefore take effect on the next run with no code redeploy.
      const candidates: number[] = [adapterBudget];
      if (deps.agentQuotas) {
        try {
          const live = await deps.agentQuotas.getMaxDiffBytes(CODE_AGENT_SLUGS.CODE_EDIT);
          if (typeof live === "number" && live > 0) {
            candidates.push(live);
            logs.push(`[${ts()}] quota.live max_diff_bytes=${live}`);
          }
        } catch (e) {
          logs.push(
            `[${ts()}] quota.lookup_failed ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
      if (payload.maxDiffBytes && payload.maxDiffBytes > 0) {
        candidates.push(payload.maxDiffBytes);
      }
      const budget = Math.min(...candidates);
      logs.push(`[${ts()}] budget.resolved bytes=${budget}`);
      const state: RunState = {
        diffBytes: 0,
        diffParts: [],
        changes: new Map(),
        ops: [],
        budget,
      };

      // The workspace is released in the finally below — even on the
      // unhappy path. The verifier never reacquires it: it validates the
      // immutable output payload (see code-edit-verifier.ts) so we get a
      // deterministic acquire→use→release lifecycle per task run.
      try {
        for (let i = 0; i < payload.operations.length; i++) {
          const result = await runOperation(fs, state, payload.operations[i], i);
          state.ops.push(result);
          if (!result.ok) {
            // First failure stops the run — no partial commits.
            const summary: CodeEditResult = {
              workspace: payload.workspace,
              modifiedFiles: await collectChanges(state.changes),
              unifiedDiff: state.diffParts.join(""),
              diffBytes: state.diffBytes,
              operations: state.ops,
            };
            logs.push(
              `[${ts()}] op[${i}].${result.op}.failed code=${result.errorCode} ${result.errorMessage}`,
            );
            return {
              success: false,
              errorCode: result.errorCode ?? CODE_ERROR_CODES.SANDBOX_ERROR,
              errorMessage: result.errorMessage ?? "operation failed",
              output: summary as unknown as Record<string, unknown>,
              logs,
              actionsTaken: state.ops
                .filter((o) => o.ok)
                .map((o) => `${o.op}:${o.path ?? ""}`),
            };
          }
          logs.push(`[${ts()}] op[${i}].${result.op}.ok`);
        }
      } finally {
        if (deps.workspaces.release) {
          try {
            await deps.workspaces.release(fs);
            logs.push(`[${ts()}] workspace.released id=${payload.workspace}`);
          } catch (e) {
            logs.push(
              `[${ts()}] workspace.release_failed ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }
      }

      const summary: CodeEditResult = {
        workspace: payload.workspace,
        modifiedFiles: await collectChanges(state.changes),
        unifiedDiff: state.diffParts.join(""),
        diffBytes: state.diffBytes,
        operations: state.ops,
      };
      logs.push(
        `[${ts()}] run.ok files_modified=${summary.modifiedFiles.length} diff_bytes=${summary.diffBytes}`,
      );

      return {
        success: true,
        output: summary as unknown as Record<string, unknown>,
        logs,
        actionsTaken: state.ops.map((o) => `${o.op}:${o.path ?? ""}`),
      };
    },
  };
}

async function collectChanges(
  changes: Map<string, { before: string | null; after: string | null }>,
): Promise<FileChange[]> {
  const out: FileChange[] = [];
  for (const [path, { before, after }] of changes) {
    out.push(await fileChange(path, before, after));
  }
  out.sort((a, b) => a.path.localeCompare(b.path));
  return out;
}
