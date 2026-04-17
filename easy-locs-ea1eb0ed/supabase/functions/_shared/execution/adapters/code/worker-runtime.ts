/**
 * Sandbox worker runtime (LC1, task #871).
 *
 * This module is loaded into a Deno `Worker` whose permissions are
 * stripped at construction time:
 *
 *   new Worker(import.meta.resolve("./worker-runtime.ts"), {
 *     type: "module",
 *     deno: {
 *       permissions: {
 *         net:  "none",
 *         env:  "none",
 *         run:  "none",
 *         ffi:  "none",
 *         hrtime: false,
 *         read:  [workspaceRoot],
 *         write: [workspaceRoot],
 *       },
 *     },
 *   });
 *
 * The worker accepts {id, op, args} requests and replies {id, ok, data |
 * error}. Every path is normalised against the supplied workspace root
 * and any attempt to escape it is rejected before the IO syscall.
 */

// deno-lint-ignore-file no-explicit-any

type Req =
  | { id: number; op: "init"; root: string }
  | { id: number; op: "list";   path: string }
  | { id: number; op: "read";   path: string }
  | { id: number; op: "write";  path: string; content: string }
  | { id: number; op: "exists"; path: string };

type Res = { id: number; ok: true; data?: unknown } | { id: number; ok: false; error: string; code?: string };

let ROOT = "";

function joinScoped(root: string, rel: string): string {
  const norm = (rel ?? "").replace(/\\/g, "/").trim();
  if (norm === "" || norm === ".") return root;
  if (norm.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(norm)) {
    throw Object.assign(new Error(`path "${rel}" is absolute`), { code: "PATH_OUT_OF_SCOPE" });
  }
  for (const seg of norm.split("/")) {
    if (seg === "..") {
      throw Object.assign(new Error(`path "${rel}" escapes workspace`), { code: "PATH_OUT_OF_SCOPE" });
    }
  }
  return `${root.replace(/\/$/, "")}/${norm}`;
}

async function ensureDir(path: string): Promise<void> {
  const slash = path.lastIndexOf("/");
  if (slash <= 0) return;
  const dir = path.slice(0, slash);
  // @ts-ignore Deno global available in worker
  await Deno.mkdir(dir, { recursive: true });
}

async function listAll(absRoot: string): Promise<string[]> {
  const out: string[] = [];
  const stack: string[] = [absRoot];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    try {
      // @ts-ignore Deno global
      for await (const entry of Deno.readDir(dir)) {
        const full = `${dir}/${entry.name}`;
        if (entry.isDirectory) stack.push(full);
        else if (entry.isFile) out.push(full);
      }
    } catch (e) {
      if ((e as { name?: string }).name === "NotFound") continue;
      throw e;
    }
  }
  return out;
}

async function handle(req: Req): Promise<Res> {
  try {
    switch (req.op) {
      case "init":
        ROOT = req.root.replace(/\/$/, "");
        return { id: req.id, ok: true };
      case "list": {
        const abs = joinScoped(ROOT, req.path);
        const files = await listAll(abs);
        const rel = files
          .map((f) => f.startsWith(`${ROOT}/`) ? f.slice(ROOT.length + 1) : f)
          .sort();
        return { id: req.id, ok: true, data: rel };
      }
      case "read": {
        const abs = joinScoped(ROOT, req.path);
        try {
          // @ts-ignore Deno global
          const text = await Deno.readTextFile(abs);
          return { id: req.id, ok: true, data: text };
        } catch (e) {
          if ((e as { name?: string }).name === "NotFound") {
            return { id: req.id, ok: true, data: null };
          }
          throw e;
        }
      }
      case "write": {
        const abs = joinScoped(ROOT, req.path);
        await ensureDir(abs);
        // @ts-ignore Deno global
        await Deno.writeTextFile(abs, req.content);
        return { id: req.id, ok: true };
      }
      case "exists": {
        const abs = joinScoped(ROOT, req.path);
        try {
          // @ts-ignore Deno global
          await Deno.stat(abs);
          return { id: req.id, ok: true, data: true };
        } catch (e) {
          if ((e as { name?: string }).name === "NotFound") {
            return { id: req.id, ok: true, data: false };
          }
          throw e;
        }
      }
      default:
        return { id: (req as Req).id, ok: false, error: `unknown op` };
    }
  } catch (e) {
    return {
      id: req.id,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      code: (e as { code?: string }).code,
    };
  }
}

(globalThis as any).onmessage = async (ev: MessageEvent) => {
  const res = await handle(ev.data as Req);
  (globalThis as any).postMessage(res);
};
