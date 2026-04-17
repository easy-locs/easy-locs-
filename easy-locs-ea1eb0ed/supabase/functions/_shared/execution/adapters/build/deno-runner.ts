/**
 * Default BuildRunner backed by `Deno.Command` (LC2, task #872).
 *
 * Spawns the configured build command (default: `vite build`), captures
 * stdout/stderr tails, walks the output `dist/` directory to compute
 * total bundle size, and returns build-minutes for cost accounting.
 *
 * Edge function bootstrap injects this; tests inject a deterministic
 * stub so this module never runs in unit-test runtimes.
 */

import type { BuildRunner } from "./build-adapter.ts";

const TAIL_LIMIT = 8_192;

function tail(s: string, max = TAIL_LIMIT): string {
  if (s.length <= max) return s;
  return s.slice(s.length - max);
}

async function dirSize(path: string): Promise<{
  total: number;
  assets: Array<{ path: string; bytes: number }>;
}> {
  const assets: Array<{ path: string; bytes: number }> = [];
  let total = 0;
  try {
    for await (const entry of Deno.readDir(path)) {
      const full = `${path}/${entry.name}`;
      if (entry.isFile) {
        const stat = await Deno.stat(full);
        total += stat.size;
        assets.push({ path: full, bytes: stat.size });
      } else if (entry.isDirectory) {
        const sub = await dirSize(full);
        total += sub.total;
        assets.push(...sub.assets);
      }
    }
  } catch {
    // dist/ not produced (build failed before write) → leave totals at 0.
  }
  return { total, assets };
}

export function createDenoBuildRunner(): BuildRunner {
  return async ({ command, workspace }) => {
    const startedAt = Date.now();
    const parts = command.trim().split(/\s+/);
    const bin = parts[0] ?? "vite";
    const args = parts.slice(1);

    const proc = new Deno.Command(bin, {
      args,
      cwd: workspace,
      stdout: "piped",
      stderr: "piped",
    });
    const { code, stdout, stderr } = await proc.output();
    const durationMs = Date.now() - startedAt;
    const buildMinutes = Math.round((durationMs / 60_000) * 10_000) / 10_000;

    const distPath = `${workspace.replace(/\/$/, "")}/dist`;
    const { total, assets } = await dirSize(distPath);

    return {
      exitCode: code,
      bundleBytes: total,
      assets,
      durationMs,
      buildMinutes,
      stdoutTail: tail(new TextDecoder().decode(stdout)),
      stderrTail: tail(new TextDecoder().decode(stderr)),
    };
  };
}
