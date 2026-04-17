/**
 * LB1 Track 1 (#841) — Direct OpenAI / fetch bypass removal proof.
 *
 * Two-fold guarantee:
 *
 *   1. Static guard: every Track 1 file MUST import from
 *      `_shared/execution/ai-dispatch.ts` and MUST NOT contain any direct
 *      `openaiChat(` call or raw `https://api.openai.com/...` fetch. This
 *      prevents the bypass from creeping back in.
 *
 *   2. Live dispatch: feature tags from ex-bypass surfaces, when fed
 *      through the canonical dispatch chain via the shared harness, end
 *      up as a row in `execution_tasks` (status=succeeded) AND a recorded
 *      `ai_interactions` entry tagged with the same feature. This is the
 *      end-to-end proof that the migrated functions inherit the platform
 *      governance contract (registry → policy → adapter → audit).
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";

import {
  buildAiDispatchHarness,
} from "./harnesses/ai-dispatch-harness.ts";
import type { TaskVerifier } from "../../supabase/functions/_shared/execution/verifier-registry.ts";
import {
  AI_DOMAIN,
  AI_TASK_TYPES,
} from "../../supabase/functions/_shared/execution/adapters/ai/types.ts";

// Files that must wire AI through the dispatch entrypoint.
const DISPATCH_OWNERS = [
  "supabase/functions/command-email-intake/parser.ts",
  "supabase/functions/ops-ai-chat/index.ts",
  "supabase/functions/generate-seo/index.ts",
  "supabase/functions/generate-cv/index.ts",
  "supabase/functions/receive-email/index.ts",
  "supabase/functions/send-notification-email/index.ts",
  "supabase/functions/generate-embeddings/index.ts",
] as const;

// All files that previously held bypass code — must be free of openaiChat
// and direct OpenAI fetches AND must not gate on OPENAI_API_KEY env var
// (provider-key resolution lives in router metadata now).
const ALL_GUARDED_FILES = [
  ...DISPATCH_OWNERS,
  // index.ts files that delegate AI to a sibling module (e.g. parser.ts):
  "supabase/functions/command-email-intake/index.ts",
] as const;

// Strip line/block comments so doc lines that mention `openaiChat` (intentional
// migration breadcrumbs) don't trigger the static guard.
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const passingVerifier = (taskType: string): TaskVerifier => ({
  domain: AI_DOMAIN,
  taskType,
  verify: async () => ({ ok: true }),
});

const ALL_AI_PASSING_VERIFIERS: TaskVerifier[] = [
  passingVerifier(AI_TASK_TYPES.COMPLETION),
  passingVerifier(AI_TASK_TYPES.EMBEDDING),
  passingVerifier(AI_TASK_TYPES.RAG),
  passingVerifier(AI_TASK_TYPES.TOOL_USE),
];

// ── Static guard ──────────────────────────────────────────────────────────

describe("LB1 Track 1 (#841) — static bypass guard", () => {
  it.each(ALL_GUARDED_FILES)(
    "%s contains no direct openaiChat / openai.com / OPENAI_API_KEY gating",
    (relPath) => {
      const abs = resolve(process.cwd(), relPath);
      const src = readFileSync(abs, "utf8");
      const code = stripComments(src);

      // Must not contain a direct openaiChat invocation.
      expect(code).not.toMatch(/\bopenaiChat\s*\(/);

      // Must not raw-fetch the OpenAI host.
      expect(code).not.toMatch(/api\.openai\.com/);

      // Must not pull in the openai-client helper any longer.
      expect(code).not.toMatch(/from\s+["'][^"']*openai-client\.ts["']/);

      // Must not gate AI behavior on direct provider-key env reads.
      // Provider keys are resolved by the registered AI router metadata,
      // not by the edge function callsite.
      expect(code).not.toMatch(/Deno\.env\.get\(\s*["']OPENAI_API_KEY["']/);
    },
  );

  it.each(DISPATCH_OWNERS)(
    "%s wires through dispatchAi* entrypoint",
    (relPath) => {
      const abs = resolve(process.cwd(), relPath);
      const src = readFileSync(abs, "utf8");
      expect(src).toMatch(
        /from\s+["']\.\.\/_shared\/execution\/ai-dispatch\.ts["']/,
      );
      expect(src).toMatch(
        /\bdispatchAi(Completion|Embedding|Rag|ToolUse)\s*\(/,
      );
    },
  );
});

// ── LB Closeout #852 — repo-wide bypass scan ─────────────────────────────
// Walks every supabase/function, lambda-handler, orchestrator file, and
// frontend src file and asserts that none of them re-introduce a direct
// provider call. The canonical homes for the OpenAI HTTP host
// (`api.openai.com`) and the legacy `openaiChat(` symbol are explicitly
// allow-listed.

const REPO_ROOT = process.cwd();

// Files where direct `api.openai.com` host calls are sanctioned because
// they ARE the canonical AI router / adapter / retired-stub home.
const OPENAI_HOST_ALLOWLIST = new Set<string>([
  "supabase/functions/_shared/ai-router.ts",
  "supabase/functions/_shared/openai-client.ts",
  "supabase/functions/_shared/execution/adapters/ai/runner-aiRoute.ts",
]);

// Files where `openaiChat(` may still appear (the retired stub throws,
// and the canonical router exports it for type back-compat with no impl).
const OPENAI_CHAT_ALLOWLIST = new Set<string>([
  "supabase/functions/_shared/openai-client.ts",
]);

// Files where `OPENAI_API_KEY` env reads are sanctioned (the canonical
// router / adapter resolves provider keys via registered metadata; the
// moderation helper inside ai-router.ts is the allow-listed home).
const OPENAI_KEY_ENV_ALLOWLIST = new Set<string>([
  "supabase/functions/_shared/ai-router.ts",
  "supabase/functions/_shared/openai-client.ts",
  "supabase/functions/_shared/execution/adapters/ai/router-config.ts",
  "supabase/functions/_shared/execution/adapters/ai/runner-aiRoute.ts",
]);

// Orchestrator uses the `@openai/agents` SDK (not direct host fetches).
// Documented Level C exception — allow-listed wholesale.
const ORCHESTRATOR_ROOT = "orchestrator";

const SCAN_ROOTS = [
  "supabase/functions",
  "lambda-handlers",
  "src",
];

const SKIP_DIRS = new Set([
  "node_modules", "dist", ".next", "build", "coverage", ".turbo",
  "__tests__", "tests", "e2e", "e2e-trends", "storybook-static",
]);

function walk(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = `${dir}/${name}`;
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx|js|mjs)$/.test(name) && !/\.test\.[tj]sx?$/.test(name)) {
      out.push(full);
    }
  }
}

function scannedFiles(): string[] {
  const all: string[] = [];
  for (const root of SCAN_ROOTS) {
    walk(resolve(REPO_ROOT, root), all);
  }
  return all
    .map((p) => relative(REPO_ROOT, p).replace(/\\/g, "/"))
    .filter((p) => !p.startsWith(`${ORCHESTRATOR_ROOT}/`));
}

describe("LB Closeout #852 — repo-wide bypass scan", () => {
  const files = scannedFiles();

  it("scan covers a meaningful number of files (sanity)", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("no file outside the allow-list calls api.openai.com directly", () => {
    const offenders: string[] = [];
    for (const rel of files) {
      if (OPENAI_HOST_ALLOWLIST.has(rel)) continue;
      const code = stripComments(readFileSync(resolve(REPO_ROOT, rel), "utf8"));
      if (/api\.openai\.com/.test(code)) offenders.push(rel);
    }
    expect(offenders, `Direct api.openai.com calls found in:\n${offenders.join("\n")}`)
      .toEqual([]);
  });

  it("no file outside the allow-list invokes openaiChat(", () => {
    const offenders: string[] = [];
    for (const rel of files) {
      if (OPENAI_CHAT_ALLOWLIST.has(rel)) continue;
      const code = stripComments(readFileSync(resolve(REPO_ROOT, rel), "utf8"));
      if (/\bopenaiChat\s*\(/.test(code)) offenders.push(rel);
    }
    expect(offenders, `openaiChat( invocations found in:\n${offenders.join("\n")}`)
      .toEqual([]);
  });

  it("no file outside the allow-list reads OPENAI_API_KEY directly", () => {
    const offenders: string[] = [];
    for (const rel of files) {
      if (OPENAI_KEY_ENV_ALLOWLIST.has(rel)) continue;
      const code = stripComments(readFileSync(resolve(REPO_ROOT, rel), "utf8"));
      if (/(?:Deno\.env\.get|process\.env)\s*[(.]\s*["']?OPENAI_API_KEY["']?/.test(code)) {
        offenders.push(rel);
      }
    }
    expect(offenders, `OPENAI_API_KEY reads found in:\n${offenders.join("\n")}`)
      .toEqual([]);
  });

  it("no file outside the allow-list imports the retired _shared/openai-client.ts", () => {
    const offenders: string[] = [];
    for (const rel of files) {
      if (OPENAI_HOST_ALLOWLIST.has(rel)) continue;
      const src = readFileSync(resolve(REPO_ROOT, rel), "utf8");
      if (/from\s+["'][^"']*openai-client(\.ts)?["']/.test(src)) offenders.push(rel);
    }
    expect(offenders, `openai-client.ts imports found in:\n${offenders.join("\n")}`)
      .toEqual([]);
  });
});

// ── Live dispatch using ex-bypass feature tags ────────────────────────────

describe("LB1 Track 1 (#841) — ex-bypass feature tags persist execution_tasks + ai_interactions", () => {
  const COMPLETION_FEATURES = [
    "command-email-intake",
    "ops-ai-chat",
    "generate-seo",
    "generate-cv",
    "receive-email.translate",
    "send-notification-email.translate",
  ];

  it.each(COMPLETION_FEATURES)(
    "completion feature=%s ⇒ succeeded execution_task + linked ai_interactions row",
    async (feature) => {
      const h = buildAiDispatchHarness({ verifiers: ALL_AI_PASSING_VERIFIERS });

      const handle = h.simulateDispatch({
        domain: AI_DOMAIN,
        taskType: AI_TASK_TYPES.COMPLETION,
        payload: {
          feature,
          messages: [{ role: "user", content: "hello" }],
        },
      });

      // Row landed in `execution_tasks` (status=queued) before the
      // orchestrator ran — proves dispatch wrote a registry-tracked row.
      const queued = h.repo.snapshot(handle.taskId);
      expect(queued?.status).toBe("queued");

      const outcome = await h.orchestrator.run(handle.taskId);
      expect(outcome.finalStatus).toBe("succeeded");

      // execution_tasks row now succeeded.
      const finalRow = h.repo.snapshot(handle.taskId);
      expect(finalRow?.status).toBe("succeeded");

      // ai_interactions row written, tagged with the caller's feature
      // and linked back to the execution_tasks row.
      expect(h.recorded).toHaveLength(1);
      expect(h.recorded[0].taskId).toBe(handle.taskId);
      expect(h.recorded[0].domainTaskType).toBe(AI_TASK_TYPES.COMPLETION);
      expect(h.recorded[0].interaction.feature).toBe(feature);

      // Quota was bumped exactly once — proves the call counted against
      // the agent's governed budget.
      expect(h.consumes).toHaveLength(1);
    },
  );

  it("embedding feature=generate-embeddings.listings ⇒ succeeded + ai_interactions row", async () => {
    const h = buildAiDispatchHarness({ verifiers: ALL_AI_PASSING_VERIFIERS });

    const handle = h.simulateDispatch({
      domain: AI_DOMAIN,
      taskType: AI_TASK_TYPES.EMBEDDING,
      payload: {
        feature: "generate-embeddings.listings",
        input: ["listing one", "listing two"],
      },
    });

    expect(h.repo.snapshot(handle.taskId)?.status).toBe("queued");

    const outcome = await h.orchestrator.run(handle.taskId);
    expect(outcome.finalStatus).toBe("succeeded");
    expect(h.repo.snapshot(handle.taskId)?.status).toBe("succeeded");

    expect(h.recorded).toHaveLength(1);
    expect(h.recorded[0].taskId).toBe(handle.taskId);
    expect(h.recorded[0].domainTaskType).toBe(AI_TASK_TYPES.EMBEDDING);
    expect(h.recorded[0].interaction.feature).toBe(
      "generate-embeddings.listings",
    );
    expect(h.consumes).toHaveLength(1);
  });
});
