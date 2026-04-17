/**
 * Sandbox FS abstraction for the code.edit adapter (LC1, task #871).
 *
 * The adapter logic NEVER touches `Deno`, `Deno.env`, the network or the
 * real repo. It speaks to a `SandboxFs` object whose implementation is
 * picked by the bootstrap:
 *
 *   - `MemoryFs`  — in-memory, used by the integration tests.
 *   - `createDenoSandbox(workspaceRoot)` — wraps a Deno Worker spawned with
 *     `permissions: { net: "none", env: "none", run: "none", read:
 *     [workspaceRoot], write: [workspaceRoot] }` so the same code path
 *     enforces the FS-scope contract at runtime.
 *
 * Both implementations share the same surface: every path is normalised
 * relative to the workspace root and any attempt to escape it (via "..",
 * absolute paths, symlink-like prefixes) is rejected with
 * CODE_ERROR_CODES.PATH_OUT_OF_SCOPE.
 */

export interface SandboxFs {
  readonly workspace: string;
  list(path: string): Promise<string[]>;
  read(path: string): Promise<string | null>;
  write(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  /** SHA-256 hex of the file content. Returns null if absent. */
  checksum(path: string): Promise<string | null>;
}

export class PathOutOfScopeError extends Error {
  constructor(public readonly path: string) {
    super(`path "${path}" escapes the workspace scope`);
    this.name = "PathOutOfScopeError";
  }
}

/**
 * Normalise an incoming path for sandboxed access.
 *   - Reject absolute paths ("/foo", "C:\\foo").
 *   - Reject any segment equal to "..".
 *   - Strip leading "./" and collapse duplicate slashes.
 */
export function normaliseSandboxPath(input: string): string {
  const raw = (input ?? "").trim();
  if (raw === "" || raw === ".") return "";
  if (raw.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(raw)) {
    throw new PathOutOfScopeError(raw);
  }
  const parts = raw.replace(/\\/g, "/").split("/").filter((p) => p !== "" && p !== ".");
  for (const p of parts) {
    if (p === "..") throw new PathOutOfScopeError(raw);
  }
  return parts.join("/");
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Pure in-memory FS. The map key is the normalised path; the value is the
 * raw text content. Directories are inferred from path prefixes.
 */
export class MemoryFs implements SandboxFs {
  readonly workspace: string;
  private readonly files = new Map<string, string>();

  constructor(workspace: string, seed: Record<string, string> = {}) {
    this.workspace = workspace;
    for (const [k, v] of Object.entries(seed)) {
      const norm = normaliseSandboxPath(k);
      if (norm === "") continue;
      this.files.set(norm, v);
    }
  }

  async list(path: string): Promise<string[]> {
    const prefix = normaliseSandboxPath(path);
    const out = new Set<string>();
    for (const key of this.files.keys()) {
      if (prefix === "" || key === prefix || key.startsWith(`${prefix}/`)) {
        out.add(key);
      }
    }
    return Array.from(out).sort();
  }

  async read(path: string): Promise<string | null> {
    const norm = normaliseSandboxPath(path);
    return this.files.has(norm) ? this.files.get(norm)! : null;
  }

  async write(path: string, content: string): Promise<void> {
    const norm = normaliseSandboxPath(path);
    if (norm === "") throw new PathOutOfScopeError(path);
    this.files.set(norm, content);
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(normaliseSandboxPath(path));
  }

  async checksum(path: string): Promise<string | null> {
    const c = await this.read(path);
    if (c === null) return null;
    return sha256Hex(c);
  }

  /** Test helper — direct snapshot of the underlying map. */
  snapshot(): Record<string, string> {
    return Object.fromEntries(this.files);
  }
}

export { sha256Hex };
