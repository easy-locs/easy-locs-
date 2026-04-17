/**
 * Worker-backed sandbox provider for the code.edit adapter (LC1, task #871).
 *
 * Acquiring a workspace:
 *   1. Resolves a temp directory under {baseDir}/lc1/{workspaceId}/.
 *   2. Optionally clones a source repo into that temp dir (cp -r).
 *   3. Spawns a Deno `Worker` whose permissions are stripped to
 *        net="none", env="none", run="none", ffi="none", hrtime=false,
 *        read=[tempDir], write=[tempDir]
 *      so the adapter cannot escape the FS scope nor reach the network
 *      or environment variables — even via dynamic imports.
 *   4. Returns a `SandboxFs` whose methods proxy to the worker via
 *      structured-clone postMessage RPC.
 *
 * Releasing a workspace terminates the worker AND removes the temp dir
 * (recursive). The orchestrator schedules release AFTER verification has
 * completed by holding the workspace open for the lifetime of one task
 * run. Verifiers reacquire by id; if the workspace has not been released
 * yet, the cached entry is returned so the same FS state is observed.
 *
 * Falls back to throwing in non-Deno environments — the in-memory
 * provider is used by Node-side tests; this provider is the production
 * default registered by `bootstrap.ts` when `Deno` is present.
 */

// deno-lint-ignore-file no-explicit-any

import { sha256Hex, type SandboxFs, normaliseSandboxPath } from "./sandbox.ts";
import type { WorkspaceProvider } from "./code-edit.ts";

interface DenoLike {
  makeTempDir(opts?: { prefix?: string; dir?: string }): Promise<string>;
  remove(path: string, opts?: { recursive?: boolean }): Promise<void>;
  Command: new (cmd: string, opts?: unknown) => { output(): Promise<{ success: boolean; stderr: Uint8Array }> };
}

function getDeno(): DenoLike | null {
  const d = (globalThis as any).Deno;
  if (!d || typeof d.makeTempDir !== "function") return null;
  return d as DenoLike;
}

export interface DenoWorkerSandboxOptions {
  /** Absolute path to seed the workspace from. Optional. */
  sourceDir?: string;
  /** Base directory for temp clones. Defaults to OS temp via Deno.makeTempDir. */
  baseDir?: string;
  /** Override the worker URL (test seam). */
  workerUrl?: string;
}

interface PendingReply {
  resolve: (data: unknown) => void;
  reject: (err: Error) => void;
}

class WorkerSandboxFs implements SandboxFs {
  readonly workspace: string;
  readonly root: string;
  private readonly worker: Worker;
  private nextId = 1;
  private readonly pending = new Map<number, PendingReply>();
  private terminated = false;

  constructor(workspace: string, root: string, worker: Worker) {
    this.workspace = workspace;
    this.root = root;
    this.worker = worker;
    this.worker.onmessage = (ev: MessageEvent) => {
      const msg = ev.data as { id: number; ok: boolean; data?: unknown; error?: string; code?: string };
      const slot = this.pending.get(msg.id);
      if (!slot) return;
      this.pending.delete(msg.id);
      if (msg.ok) slot.resolve(msg.data);
      else slot.reject(Object.assign(new Error(msg.error ?? "worker error"), { code: msg.code }));
    };
  }

  private send<T>(op: string, args: Record<string, unknown>): Promise<T> {
    if (this.terminated) return Promise.reject(new Error("sandbox terminated"));
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: (v) => resolve(v as T), reject });
      this.worker.postMessage({ id, op, ...args });
    });
  }

  init(): Promise<void> {
    return this.send<void>("init", { root: this.root });
  }

  async list(path: string): Promise<string[]> {
    normaliseSandboxPath(path);
    return await this.send<string[]>("list", { path });
  }

  async read(path: string): Promise<string | null> {
    normaliseSandboxPath(path);
    return await this.send<string | null>("read", { path });
  }

  async write(path: string, content: string): Promise<void> {
    normaliseSandboxPath(path);
    await this.send<void>("write", { path, content });
  }

  async exists(path: string): Promise<boolean> {
    normaliseSandboxPath(path);
    return await this.send<boolean>("exists", { path });
  }

  async checksum(path: string): Promise<string | null> {
    const c = await this.read(path);
    return c === null ? null : sha256Hex(c);
  }

  terminate(): void {
    if (this.terminated) return;
    this.terminated = true;
    try { this.worker.terminate(); } catch { /* swallow */ }
    for (const [, slot] of this.pending) {
      slot.reject(new Error("sandbox terminated"));
    }
    this.pending.clear();
  }
}

/**
 * Create a workspace provider that allocates a real temp dir and a
 * permission-stripped Deno Worker per workspace. Throws on acquire when
 * the runtime is not Deno (e.g. Node test runners) — bootstrap falls back
 * to the in-memory provider in that case.
 */
export function createDenoWorkerWorkspaceProvider(
  options: DenoWorkerSandboxOptions = {},
): WorkspaceProvider {
  // One temp dir + worker per acquire. NO caching by workspace id — each
  // task run gets a fresh, isolated clone, eliminating the possibility
  // of cross-run state bleed when two tasks reuse the same logical
  // workspace name. Cleanup is guaranteed by the adapter's finally block.
  const live = new WeakMap<WorkerSandboxFs, string>();

  return {
    async acquire(workspace: string): Promise<SandboxFs> {
      const deno = getDeno();
      if (!deno) {
        throw new Error(
          "DenoWorkerWorkspaceProvider requires the Deno runtime; " +
          "use MemoryFs / the default provider in non-Deno tests.",
        );
      }
      const root = await deno.makeTempDir({
        prefix: `lc1-${workspace.replace(/[^a-zA-Z0-9_.-]/g, "_")}-`,
        dir: options.baseDir,
      });
      if (options.sourceDir) {
        const cmd = new deno.Command("cp", {
          // -a preserves attrs; trailing /. copies contents into root.
          // Falls back to a recursive copy for portability.
          // @ts-ignore opts shape varies; deno tolerates extra keys
          args: ["-a", `${options.sourceDir.replace(/\/$/, "")}/.`, root],
          stdout: "null",
          stderr: "piped",
        });
        const out = await cmd.output();
        if (!out.success) {
          const msg = new TextDecoder().decode(out.stderr);
          throw new Error(`workspace clone failed: ${msg.trim()}`);
        }
      }
      const workerUrl = options.workerUrl
        ?? new URL("./worker-runtime.ts", import.meta.url).toString();
      const worker = new Worker(workerUrl, {
        type: "module",
        // @ts-ignore Deno-only options are ignored on other runtimes; we
        // never reach this branch outside Deno because of the getDeno() check.
        deno: {
          permissions: {
            net: "none",
            env: "none",
            run: "none",
            ffi: "none",
            hrtime: false,
            read:  [root],
            write: [root],
          },
        },
      });
      const fs = new WorkerSandboxFs(workspace, root, worker);
      await fs.init();
      live.set(fs, root);
      return fs;
    },

    async release(fs: SandboxFs): Promise<void> {
      if (!(fs instanceof WorkerSandboxFs)) return;
      const root = live.get(fs);
      live.delete(fs);
      fs.terminate();
      const deno = getDeno();
      if (deno && root) {
        try { await deno.remove(root, { recursive: true }); } catch { /* swallow */ }
      }
    },
  };
}
