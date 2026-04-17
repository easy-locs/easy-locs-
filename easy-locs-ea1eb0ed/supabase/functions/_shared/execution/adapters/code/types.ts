/**
 * Code-edit adapter — payload typings + validation (LC1, task #871).
 *
 * The `code.edit` adapter is the primitive Level-C build agents (planner,
 * builder, verifier) consume. A single task carries an ordered list of
 * sandboxed file operations executed against a workspace cloned from the
 * repo into a temporary directory.
 */

export const CODE_DOMAIN = "code";

export const CODE_TASK_TYPES = {
  EDIT: "code.edit",
} as const;

export type CodeTaskType = (typeof CODE_TASK_TYPES)[keyof typeof CODE_TASK_TYPES];

export const CODE_AGENT_SLUGS = {
  CODE_EDIT: "code.edit",
} as const;

export const CODE_CAPABILITIES = [
  "read_file",
  "write_file",
  "apply_diff",
  "list_files",
] as const;

export type CodeCapability = (typeof CODE_CAPABILITIES)[number];

export const CODE_ERROR_CODES = {
  INVALID_PAYLOAD: "INVALID_PAYLOAD",
  WORKSPACE_MISSING: "WORKSPACE_MISSING",
  PATH_OUT_OF_SCOPE: "PATH_OUT_OF_SCOPE",
  FILE_NOT_FOUND: "FILE_NOT_FOUND",
  DIFF_BUDGET_EXCEEDED: "DIFF_BUDGET_EXCEEDED",
  PATCH_NOT_APPLIED: "PATCH_NOT_APPLIED",
  SANDBOX_ERROR: "SANDBOX_ERROR",
  UNSUPPORTED_OP: "UNSUPPORTED_OP",
} as const;

export type CodeErrorCode =
  (typeof CODE_ERROR_CODES)[keyof typeof CODE_ERROR_CODES];

export const DEFAULT_DIFF_BUDGET_BYTES = 50 * 1024 * 1024; // 50 MB
export const DEFAULT_OPS_PER_DAY = 1000;

// ── Operation shapes ─────────────────────────────────────────────────────

export interface ListFilesOp {
  op: "list_files";
  path?: string;
}

export interface ReadFileOp {
  op: "read_file";
  path: string;
}

export interface WriteFileOp {
  op: "write_file";
  path: string;
  content: string;
}

/**
 * Anchored textual replace. We deliberately avoid a fragile unified-diff
 * parser at the boundary: the caller supplies the literal substring to
 * replace and its replacement; the adapter rejects ambiguous matches and
 * emits the resulting unified diff in the structured output.
 */
export interface ApplyDiffOp {
  op: "apply_diff";
  path: string;
  find: string;
  replace: string;
}

export type CodeEditOp = ListFilesOp | ReadFileOp | WriteFileOp | ApplyDiffOp;

export interface CodeEditPayload {
  /** Workspace identifier — clones the repo into a temp dir under this id. */
  workspace: string;
  operations: CodeEditOp[];
  /** Optional adapter-level diff budget override (bytes). */
  maxDiffBytes?: number;
}

export interface ValidationResult<T> {
  ok: boolean;
  data?: T;
  reason?: string;
}

function isOp(v: unknown): v is CodeEditOp {
  if (!v || typeof v !== "object") return false;
  const op = (v as { op?: unknown }).op;
  return op === "list_files" || op === "read_file" ||
    op === "write_file" || op === "apply_diff";
}

export function validateCodeEditPayload(
  p: unknown,
): ValidationResult<CodeEditPayload> {
  if (!p || typeof p !== "object") {
    return { ok: false, reason: "payload must be an object" };
  }
  const obj = p as Record<string, unknown>;
  const workspace = typeof obj.workspace === "string" ? obj.workspace.trim() : "";
  if (!workspace) return { ok: false, reason: "workspace is required" };
  if (!Array.isArray(obj.operations) || obj.operations.length === 0) {
    return { ok: false, reason: "operations must be a non-empty array" };
  }
  const ops: CodeEditOp[] = [];
  for (let i = 0; i < obj.operations.length; i++) {
    const raw = obj.operations[i];
    if (!isOp(raw)) {
      return { ok: false, reason: `operations[${i}].op is invalid` };
    }
    const o = raw as Record<string, unknown>;
    switch (o.op) {
      case "list_files":
        ops.push({
          op: "list_files",
          path: typeof o.path === "string" ? o.path : undefined,
        });
        break;
      case "read_file":
        if (typeof o.path !== "string" || !o.path.trim()) {
          return { ok: false, reason: `operations[${i}].path is required` };
        }
        ops.push({ op: "read_file", path: o.path });
        break;
      case "write_file":
        if (typeof o.path !== "string" || !o.path.trim()) {
          return { ok: false, reason: `operations[${i}].path is required` };
        }
        if (typeof o.content !== "string") {
          return { ok: false, reason: `operations[${i}].content is required` };
        }
        ops.push({ op: "write_file", path: o.path, content: o.content });
        break;
      case "apply_diff":
        if (typeof o.path !== "string" || !o.path.trim()) {
          return { ok: false, reason: `operations[${i}].path is required` };
        }
        if (typeof o.find !== "string" || typeof o.replace !== "string") {
          return {
            ok: false,
            reason: `operations[${i}] requires string "find" and "replace"`,
          };
        }
        ops.push({
          op: "apply_diff",
          path: o.path,
          find: o.find,
          replace: o.replace,
        });
        break;
    }
  }
  const maxDiffBytes = typeof obj.maxDiffBytes === "number" && obj.maxDiffBytes > 0
    ? obj.maxDiffBytes
    : undefined;
  return { ok: true, data: { workspace, operations: ops, maxDiffBytes } };
}

// ── Result shapes ─────────────────────────────────────────────────────────

export interface FileChange {
  path: string;
  beforeChecksum: string | null;
  afterChecksum: string | null;
  beforeBytes: number;
  afterBytes: number;
}

export interface OpResult {
  index: number;
  op: CodeEditOp["op"];
  path?: string;
  ok: boolean;
  /** Result-specific payload (file listing, file content, change descriptor). */
  data?: unknown;
  errorCode?: CodeErrorCode;
  errorMessage?: string;
}

export interface CodeEditResult {
  workspace: string;
  modifiedFiles: FileChange[];
  unifiedDiff: string;
  diffBytes: number;
  operations: OpResult[];
}
