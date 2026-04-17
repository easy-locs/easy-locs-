/**
 * ESLint RuleTester suite for eslint-plugin-easylocs.
 * Covers passing + failing cases for both rules and the allow-list path.
 */
import { describe, it } from "vitest";
import { RuleTester } from "eslint";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error — local plugin (.js, ESM, no .d.ts).
import plugin from "../../tooling/eslint-plugin-easylocs/index.js";

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

describe("require-dispatch-execution-task", () => {
  it("runs the rule tester", () => {
    tester.run(
      "require-dispatch-execution-task",
      plugin.rules["require-dispatch-execution-task"],
      {
        valid: [
          // Helper call — sanctioned entry point.
          {
            code: `dispatchExecutionTask({ domain: 'marketplace', taskType: 'X' })`,
            filename: "src/components/widget.tsx",
          },
          // Read-only chains — must NOT be flagged.
          {
            code: `db.from('users').select('*').eq('id', 1).single();`,
            filename: "src/components/widget.tsx",
          },
          {
            code: `supabase.from('orders').select('*');`,
            filename: "src/components/widget.tsx",
          },
          // Unrelated `.update` not coming from `.from()` — not flagged.
          {
            code: `state.update({ x: 1 });`,
            filename: "src/components/widget.tsx",
          },
          // Allow-listed file path (matches our default global exemption).
          {
            code: `db.from('listings').insert({ id: 1 });`,
            filename: "src/test/fixtures.test.ts",
          },
          {
            code: `db.from('agents').upsert({});`,
            filename:
              "supabase/functions/_shared/execution/adapters/marketplace/listing-repository.ts",
          },
        ],
        invalid: [
          {
            code: `db.from('users').update({ name: 'x' });`,
            filename: "src/components/widget.tsx",
            errors: [{ messageId: "illegal" }],
          },
          {
            code: `supabase.from('orders').insert([{ id: 1 }]);`,
            filename: "src/services/orders.service.ts",
            errors: [{ messageId: "illegal" }],
          },
          {
            code: `getClient().from('x').delete().eq('id', 1);`,
            filename: "src/repositories/x.ts",
            errors: [{ messageId: "illegal" }],
          },
          {
            code: `sb.schema('public').from('agents').upsert({});`,
            filename: "src/lib/foo.ts",
            errors: [{ messageId: "illegal" }],
          },
          // Conditional mutation still caught.
          {
            code: `if (cond) { db.from('y').delete(); }`,
            filename: "src/lib/foo.ts",
            errors: [{ messageId: "illegal" }],
          },
          // CRITICAL: db('table') shorthand bypass — must be caught.
          {
            code: `db('users').update({ name: 'x' });`,
            filename: "src/lib/foo.ts",
            errors: [{ messageId: "illegal" }],
          },
          {
            code: `db('orders').insert([{ id: 1 }]);`,
            filename: "src/lib/foo.ts",
            errors: [{ messageId: "illegal" }],
          },
          {
            code: `v2db('legacy').upsert({ id: 1 });`,
            filename: "src/lib/foo.ts",
            errors: [{ messageId: "illegal" }],
          },
          {
            code: `await db('users').delete().eq('id', 1);`,
            filename: "src/lib/foo.ts",
            errors: [{ messageId: "illegal" }],
          },
        ],
      },
    );
  });
});

describe("no-direct-rpc-mutation", () => {
  it("runs the rule tester", () => {
    tester.run(
      "no-direct-rpc-mutation",
      plugin.rules["no-direct-rpc-mutation"],
      {
        valid: [
          // Allow-listed file.
          {
            code: `db.rpc('lookup_thing', { id: 1 });`,
            filename: "src/test/fixtures.test.ts",
          },
          // Non-builder receiver — not flagged.
          {
            code: `myService.rpc('whatever');`,
            filename: "src/lib/new-thing.ts",
          },
          // The dispatch helper is the canonical RPC entry point.
          {
            code: `db.schema('system').rpc('dispatch_execution_task', { p: 1 });`,
            filename: "src/lib/execution/dispatch.ts",
          },
        ],
        invalid: [
          {
            code: `db.rpc('transfer_locs', { from_id: 1, to_id: 2 });`,
            filename: "src/lib/wallet/wallet-engine.ts",
            errors: [{ messageId: "illegal" }],
          },
          {
            code: `supabase.rpc('do_thing', {});`,
            filename: "src/lib/new-thing.ts",
            errors: [{ messageId: "illegal" }],
          },
          {
            code: `await db.rpc('mutate_x');`,
            filename: "src/lib/new-thing.ts",
            errors: [{ messageId: "illegal" }],
          },
        ],
      },
    );
  });
});

describe("allowlistPath rule option", () => {
  it("loads exemptions from a custom allow-list file when option is set", () => {
    // Write a throwaway allow-list and point the rule at it via options.
    const dir = mkdtempSync(join(tmpdir(), "easylocs-allow-"));
    const customAllow = join(dir, "custom-allow.json");
    writeFileSync(
      customAllow,
      JSON.stringify({
        globalExemptions: [],
        exemptions: [
          { pattern: "src/sandbox/**", reason: "scratch dir for option test" },
        ],
      }),
    );
    tester.run(
      "require-dispatch-execution-task",
      plugin.rules["require-dispatch-execution-task"],
      {
        valid: [
          // File is NOT in the default allow-list but IS in the option-supplied
          // one — so it must be exempt.
          {
            code: `db.from('x').update({ a: 1 });`,
            filename: "src/sandbox/scratch.ts",
            options: [{ allowlistPath: customAllow }],
          },
        ],
        invalid: [
          // Same file, no option → must still be flagged.
          {
            code: `db.from('x').update({ a: 1 });`,
            filename: "src/sandbox/scratch.ts",
            errors: [{ messageId: "illegal" }],
          },
        ],
      },
    );
  });
});

describe("no-direct-postgrest-mutation", () => {
  it("runs the rule tester", () => {
    tester.run(
      "no-direct-postgrest-mutation",
      plugin.rules["no-direct-postgrest-mutation"],
      {
        valid: [
          // GET against PostgREST is fine (read).
          {
            code: `fetch('https://x.supabase.co/rest/v1/users', { method: 'GET' });`,
            filename: "src/lib/foo.ts",
          },
          // POST to a non-PostgREST URL is fine.
          {
            code: `fetch('https://api.example.com/x', { method: 'POST' });`,
            filename: "src/lib/foo.ts",
          },
          // Allow-listed file.
          {
            code: `fetch('/rest/v1/x', { method: 'POST' });`,
            filename: "src/test/fixtures.test.ts",
          },
        ],
        invalid: [
          {
            code: `fetch('https://x.supabase.co/rest/v1/users', { method: 'POST' });`,
            filename: "src/lib/new-thing.ts",
            errors: [{ messageId: "illegal" }],
          },
          {
            code: `fetch(\`\${SUPABASE_URL}/rest/v1/orders\`, { method: 'PATCH' });`,
            filename: "src/lib/new-thing.ts",
            errors: [{ messageId: "illegal" }],
          },
          {
            code: `fetch('/rest/v1/agents', { method: 'DELETE' });`,
            filename: "src/lib/new-thing.ts",
            errors: [{ messageId: "illegal" }],
          },
        ],
      },
    );
  });
});
