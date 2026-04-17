/**
 * eslint-plugin-easylocs
 *
 * Sovereign Agent Control — Level A · L6 (task #809) lint rules.
 *
 * Two hard guards:
 *   1. `require-dispatch-execution-task` — bans any
 *      `<receiver>.from('<table>').(insert|update|delete|upsert)(...)` chain
 *      outside the explicit allow-list. Every mutation MUST flow through
 *      `dispatchExecutionTask({ domain, taskType, payload })` so the
 *      platform-native agent registry, policy engine, approvals and audit
 *      trail can see (and govern) it.
 *
 *   2. `no-direct-postgrest-mutation` — bans `fetch(url, { method: 'POST'
 *      | 'PATCH' | 'DELETE' })` calls whose URL targets PostgREST
 *      (`/rest/v1/`). This stops developers from sneaking around the
 *      supabase-js client to mutate tables.
 *
 * The allow-list is a single JSON file at the repo root:
 *   .eslintrc.dispatch-allowlist.json
 * Each entry has a `pattern` (glob) and a `reason`. New exemptions require
 * a PR review per the rule's documentation
 * (docs/architecture/dispatch-guard.md).
 */

import path from "node:path";
import fs from "node:fs";
import minimatchPkg from "minimatch";
const minimatch = minimatchPkg.minimatch ?? minimatchPkg;

const MUTATION_METHODS = new Set(["insert", "update", "delete", "upsert"]);
const MUTATION_HTTP_METHODS = new Set(["POST", "PATCH", "DELETE", "PUT"]);

// Identifiers that are known PostgREST builder roots in this codebase.
// `db('orders')` is the project's canonical shorthand and returns the same
// builder as `db.from('orders')` — both must be guarded.
const BUILDER_ROOT_NAMES = /^(db|v2db|supabase|sb|client|getClient)$/;
const BUILDER_ROOT_SUFFIX = /(?:^|[a-z])Db$|(?:^|[a-z])db$/; // orbitDb, domainDb, etc.

function isBuilderRootIdentifier(node) {
  if (!node || node.type !== "Identifier" || !node.name) return false;
  return BUILDER_ROOT_NAMES.test(node.name) || BUILDER_ROOT_SUFFIX.test(node.name);
}

/**
 * Walk a chained MemberExpression / CallExpression receiver and return true
 * if any link is:
 *   (a) a CallExpression whose callee is a MemberExpression with
 *       `.property.name === 'from'` (the supabase-js entry point), OR
 *   (b) a CallExpression whose callee is itself a known builder-root
 *       identifier — `db('table')`, `v2db('table')`, `supabase('table')`,
 *       `domainDb.x('table')` etc. — i.e. the project's call-style shorthand
 *       that returns a PostgREST builder.
 *
 * Examples that match:
 *   sb.from('users').update(...)
 *   db.from('orders').insert(...)
 *   db('orders').insert(...)                  // shorthand — CRITICAL
 *   v2db('legacy_table').upsert(...)
 *   supabase.schema('system').from('agents').upsert(...)
 *   getClient().from('x').delete()
 */
function chainIsBuilderChain(node) {
  let cur = node;
  let safety = 0;
  while (cur && safety++ < 50) {
    if (cur.type === "CallExpression") {
      const c = cur.callee;
      // (a) `.from(...)` link
      if (
        c &&
        c.type === "MemberExpression" &&
        c.property &&
        c.property.type === "Identifier" &&
        c.property.name === "from"
      ) {
        return true;
      }
      // (b) `db('table')` shorthand — direct call on a builder-root id
      if (isBuilderRootIdentifier(c)) {
        return true;
      }
      // descend through member-expression callees (e.g. `domainDb.foo('t')`)
      if (c && c.type === "MemberExpression") {
        // domainDb.foo('t') — foo is a domain accessor returning a builder
        if (isBuilderRootIdentifier(c.object)) return true;
        cur = c.object;
      } else {
        return false;
      }
    } else if (cur.type === "MemberExpression") {
      cur = cur.object;
    } else {
      return false;
    }
  }
  return false;
}

function loadAllowlist(cwd) {
  // ESLint runs from the workspace root; fall back to a fixed env var so
  // the rule works no matter how the linter is invoked.
  const candidates = [
    process.env.EASYLOCS_DISPATCH_ALLOWLIST,
    path.join(cwd || process.cwd(), ".eslintrc.dispatch-allowlist.json"),
  ].filter(Boolean);
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return JSON.parse(fs.readFileSync(p, "utf8"));
      }
    } catch {
      /* ignore */
    }
  }
  return { exemptions: [], globalExemptions: [] };
}

let _allowlistCache = null;
function getAllowlist(cwd) {
  if (_allowlistCache) return _allowlistCache;
  _allowlistCache = loadAllowlist(cwd);
  return _allowlistCache;
}

function isExempt(filename, cwd) {
  if (!filename) return false;
  const rel = path.relative(cwd || process.cwd(), filename).split(path.sep).join("/");
  const al = getAllowlist(cwd);
  const all = [
    ...(al.globalExemptions ?? []),
    ...(al.exemptions ?? []),
  ];
  for (const e of all) {
    const pat = typeof e === "string" ? e : e.pattern;
    if (!pat) continue;
    if (rel === pat || minimatch(rel, pat, { dot: true })) return true;
  }
  return false;
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Rule 1: require-dispatch-execution-task                                  */
/* ──────────────────────────────────────────────────────────────────────── */

const requireDispatch = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid direct `.from(...).insert|update|delete|upsert(...)` mutations outside the dispatch path. All mutations must flow through `dispatchExecutionTask({ domain, taskType, payload })`.",
      url: "docs/architecture/dispatch-guard.md",
    },
    schema: [
      {
        type: "object",
        properties: {
          allowlistPath: { type: "string" },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      illegal:
        "[easylocs/require-dispatch-execution-task] Direct `.from(...).{{method}}(...)` is forbidden — route this mutation through `dispatchExecutionTask({ domain, taskType, payload })` (see docs/architecture/dispatch-guard.md). To request an exemption, add the file to .eslintrc.dispatch-allowlist.json with a written reason.",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    const cwd = context.cwd || (context.getCwd && context.getCwd()) || process.cwd();
    if (isExempt(filename, cwd)) {
      return {};
    }
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          !callee ||
          callee.type !== "MemberExpression" ||
          !callee.property ||
          callee.property.type !== "Identifier" ||
          !MUTATION_METHODS.has(callee.property.name)
        ) {
          return;
        }
        if (!chainIsBuilderChain(callee.object)) return;
        context.report({
          node,
          messageId: "illegal",
          data: { method: callee.property.name },
        });
      },
    };
  },
};

/* ──────────────────────────────────────────────────────────────────────── */
/* Rule 2: no-direct-postgrest-mutation                                     */
/* ──────────────────────────────────────────────────────────────────────── */

function literalString(node) {
  if (!node) return null;
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "TemplateLiteral") {
    return node.quasis.map((q) => q.value.cooked).join("\u0000");
  }
  return null;
}

function looksLikePostgrestUrl(s) {
  if (!s) return false;
  return /\/rest\/v1\//.test(s) || /\$\{[^}]*SUPABASE[^}]*\}\/rest\//i.test(s);
}

function extractMethod(optionsNode) {
  if (!optionsNode || optionsNode.type !== "ObjectExpression") return null;
  for (const p of optionsNode.properties) {
    if (
      p.type === "Property" &&
      ((p.key.type === "Identifier" && p.key.name === "method") ||
        (p.key.type === "Literal" && p.key.value === "method"))
    ) {
      const v = literalString(p.value);
      if (typeof v === "string") return v.toUpperCase();
    }
  }
  return null;
}

const noDirectPostgrest = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid direct PostgREST mutation calls via fetch(). Mutations must go through `dispatchExecutionTask`.",
      url: "docs/architecture/dispatch-guard.md",
    },
    schema: [],
    messages: {
      illegal:
        "[easylocs/no-direct-postgrest-mutation] Direct `fetch('{{url}}', { method: '{{method}}' })` against PostgREST is forbidden — use `dispatchExecutionTask({ domain, taskType, payload })` (see docs/architecture/dispatch-guard.md).",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    const cwd = context.cwd || (context.getCwd && context.getCwd()) || process.cwd();
    if (isExempt(filename, cwd)) return {};
    return {
      CallExpression(node) {
        const callee = node.callee;
        const isFetch =
          (callee.type === "Identifier" && callee.name === "fetch") ||
          (callee.type === "MemberExpression" &&
            callee.property.type === "Identifier" &&
            callee.property.name === "fetch");
        if (!isFetch) return;
        const url = literalString(node.arguments[0]);
        if (!looksLikePostgrestUrl(url)) return;
        const method = extractMethod(node.arguments[1]);
        if (!method || !MUTATION_HTTP_METHODS.has(method)) return;
        context.report({
          node,
          messageId: "illegal",
          data: { url: (url || "").replace(/\u0000/g, "${…}").slice(0, 80), method },
        });
      },
    };
  },
};

/* ──────────────────────────────────────────────────────────────────────── */

/* ──────────────────────────────────────────────────────────────────────── */
/* Rule 3: no-direct-rpc-mutation                                           */
/*                                                                          */
/* `db.rpc('fn', args)` can call any Postgres function — including ones     */
/* that perform writes — so static "read vs write" classification is        */
/* impossible. We fail closed: every `db.rpc(...)` / `<root>.rpc(...)`     */
/* call must live in an allow-listed file. Read-only RPCs (lookups, etc.)  */
/* are exempted via the allow-list with a written reason; mutating RPCs    */
/* must move to `dispatchExecutionTask`.                                   */
/* ──────────────────────────────────────────────────────────────────────── */

const noDirectRpc = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid direct `db.rpc(...)` / `<builder>.rpc(...)` calls outside the dispatch path. RPCs can mutate state and must be allow-listed (read-only) or routed through `dispatchExecutionTask`.",
      url: "docs/architecture/dispatch-guard.md",
    },
    schema: [],
    messages: {
      illegal:
        "[easylocs/no-direct-rpc-mutation] Direct `.rpc('{{name}}', ...)` is forbidden — RPCs may mutate state and must flow through `dispatchExecutionTask({ domain, taskType, payload })`. To exempt a known read-only RPC, add the file to .eslintrc.dispatch-allowlist.json with a written reason (see docs/architecture/dispatch-guard.md).",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    const cwd = context.cwd || (context.getCwd && context.getCwd()) || process.cwd();
    if (isExempt(filename, cwd)) return {};
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          !callee ||
          callee.type !== "MemberExpression" ||
          !callee.property ||
          callee.property.type !== "Identifier" ||
          callee.property.name !== "rpc"
        ) {
          return;
        }
        // Only flag rpc() on a builder-root receiver (db.rpc, supabase.rpc,
        // sb.rpc, orbitDb.rpc, getClient().rpc(), supabase.schema(s).rpc, …).
        const receiver = callee.object;
        const isRoot =
          isBuilderRootIdentifier(receiver) ||
          (receiver &&
            receiver.type === "CallExpression" &&
            chainIsBuilderChain(receiver)) ||
          (receiver &&
            receiver.type === "MemberExpression" &&
            chainIsBuilderChain(receiver));
        if (!isRoot) return;
        const name = literalString(node.arguments[0]) || "<dynamic>";
        context.report({
          node,
          messageId: "illegal",
          data: { name: name.replace(/\u0000/g, "${…}").slice(0, 60) },
        });
      },
    };
  },
};

/* ──────────────────────────────────────────────────────────────────────── */

const plugin = {
  meta: { name: "eslint-plugin-easylocs", version: "0.1.0" },
  rules: {
    "require-dispatch-execution-task": requireDispatch,
    "no-direct-postgrest-mutation": noDirectPostgrest,
    "no-direct-rpc-mutation": noDirectRpc,
  },
};

export default plugin;
export { requireDispatch, noDirectPostgrest, noDirectRpc };
