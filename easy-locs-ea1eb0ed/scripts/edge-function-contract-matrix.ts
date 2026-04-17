#!/usr/bin/env -S npx tsx
/**
 * Frontend ↔ Edge Function contract matrix.
 *
 * Walks `src/` for every call site that targets a Supabase Edge Function and
 * cross-references the targets against `supabase/functions/` on disk, the
 * security manifest (`_manifest.ts`) and the contract registry
 * (`_contracts.ts`).
 *
 * Two call patterns are recognised:
 *   1. `<client>.functions.invoke('<name>', { body, headers, ... })`
 *   2. `fetch('.../functions/v1/<name>...', { method, body, headers })`
 *
 * Outputs:
 *   - docs/edge-functions-contract-matrix.md   (human-readable matrix)
 *   - docs/edge-functions-contract-matrix.json (machine-readable, for CI)
 *
 * --ci flag: exits non-zero on ANY of:
 *   1. Orphaned frontend call (target function does not exist on disk).
 *   2. Method incompatibility (caller HTTP method not in handler's accepted
 *      methods, where the handler is in the contract registry).
 *   3. Missing required body field (caller body literal is missing a key
 *      listed in `_contracts.ts` requestBody.required).
 *   4. Missing Authorization for a `fetch()` call against a function whose
 *      contract sets `requireAuthHeader: true` (or whose manifest says
 *      `auth: jwt` and the contract has not opted out).
 *   5. Stale committed artifact relative to the freshly-computed matrix.
 *
 * Orphaned edge functions (no caller) are reported but do NOT fail the
 * build — they are inputs to the consolidation effort (#226).
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC_DIR = path.join(ROOT, "src");
const FUNCTIONS_DIR = path.join(ROOT, "supabase", "functions");
const DOCS_DIR = path.join(ROOT, "docs");
const MD_OUT = path.join(DOCS_DIR, "edge-functions-contract-matrix.md");
const JSON_OUT = path.join(DOCS_DIR, "edge-functions-contract-matrix.json");

const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mts", ".cts"]);
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".next", "storybook-static", "coverage"]);

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";

interface CallSite {
  file: string;
  line: number;
  column: number;
  fn: string;
  /**
   * `invoke`  — explicit `<client>.functions.invoke(...)` call.
   * `fetch`   — explicit `fetch('.../functions/v1/...', { ... })` call.
   * `url-ref` — bare `/functions/v1/<name>` string in source (URL constant,
   *             template literal, etc.) that is not part of a fetch() call.
   *             Counted as a reference but not subject to method/body/auth
   *             contract checks since the actual call may happen elsewhere.
   */
  kind: "invoke" | "fetch" | "url-ref";
  method: HttpMethod;
  hasBody: boolean;
  hasHeaders: boolean;
  /** Top-level keys extracted from the body literal (best-effort). */
  bodyKeys: string[];
  /** True if the body literal contains a `...spread` we couldn't resolve. */
  bodyHasSpread: boolean;
  snippet: string;
}

interface FunctionInfo {
  name: string;
  hasIndex: boolean;
  /**
   * Methods the handler accepts. `null` means the handler does NOT gate on
   * `req.method` beyond the OPTIONS short-circuit, so any method is passed
   * through to the body of the handler. A specific list means the handler
   * explicitly checks `req.method` and rejects everything else.
   */
  methods: HttpMethod[] | null;
  /** True if the handler calls `req.json()` without a graceful catch. */
  requiresJsonBody: boolean;
  manifestAuth?: string;
  manifestRateLimit?: boolean;
  hasContract: boolean;
}

interface Mismatch {
  kind:
    | "orphan"
    | "method"
    | "missing-field"
    | "missing-body"
    | "missing-auth-header"
    | "unhandled-errors"
    | "undeclared-response-field";
  fn: string;
  caller: string;
  detail: string;
}

interface MatrixEntry {
  fn: string;
  exists: boolean;
  callers: CallSite[];
  info?: FunctionInfo;
  contractFields?: string[];
  contractMethods?: HttpMethod[];
  mismatches: Mismatch[];
}

interface Matrix {
  generatedAt: string;
  totals: {
    callSites: number;
    /** Call sites where at least one contract assertion was actually run. */
    verifiedCallSites: number;
    uniqueTargets: number;
    functionsOnDisk: number;
    declaredContracts: number;
    contractCoverage: string; // e.g. "10/117 (8.5%)"
    orphanedFrontendCalls: number;
    orphanedEdgeFunctions: number;
    methodMismatches: number;
    missingFieldMismatches: number;
    missingBodyMismatches: number;
    missingAuthHeaderMismatches: number;
    unhandledErrorsWarnings: number;
    undeclaredResponseFieldWarnings: number;
  };
  entries: MatrixEntry[];
  orphanedFunctions: string[];
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (SOURCE_EXTS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

/**
 * Brace-balanced extractor: finds the next call expression starting at
 * `marker` and returns the substring between the matching parens. Skips
 * string literals so braces/parens inside strings don't confuse the count.
 */
function extractCallArgs(text: string, openIdx: number): string | null {
  if (text[openIdx] !== "(") return null;
  let depth = 0;
  let inStr: string | null = null;
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inStr = ch;
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return text.slice(openIdx + 1, i);
    }
  }
  return null;
}

const INVOKE_HEAD_RE =
  /\bfunctions\s*\.\s*invoke\s*\(\s*(['"`])([a-zA-Z0-9_\-./]+)\1/g;
const FETCH_HEAD_RE = /\bfetch\s*\(/g;
const URL_V1_RE = /\/functions\/v1\/([a-zA-Z0-9_-]+)(?:[?/][^'"`\s)]*)?/g;

function lineColOf(text: string, index: number): { line: number; column: number } {
  let line = 1;
  let lastNl = -1;
  for (let i = 0; i < index; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
      lastNl = i;
    }
  }
  return { line, column: index - lastNl };
}

function snippetAt(text: string, index: number, len = 140): string {
  return text.slice(index, index + len).replace(/\s+/g, " ").trim();
}

/** Pull the substring of an object literal starting at `key:` until the
 *  matching closing brace. Best-effort, brace-aware (ignores braces inside
 *  strings/template literals). Returns null if not found. */
function extractKeyValue(opts: string, key: string): string | null {
  const re = new RegExp(`\\b${key}\\s*:\\s*`);
  const m = re.exec(opts);
  if (!m) return null;
  const start = m.index + m[0].length;
  const c = opts[start];
  if (c === "{" || c === "[") {
    // Brace-balanced extraction.
    const open = c;
    const close = c === "{" ? "}" : "]";
    let depth = 0;
    let inStr: string | null = null;
    for (let i = start; i < opts.length; i++) {
      const ch = opts[i];
      if (inStr) {
        if (ch === "\\") {
          i++;
          continue;
        }
        if (ch === inStr) inStr = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") {
        inStr = ch;
        continue;
      }
      if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) return opts.slice(start, i + 1);
      }
    }
    return opts.slice(start);
  }
  // Scalar value: read until comma at depth 0 or end.
  let depth = 0;
  let inStr: string | null = null;
  for (let i = start; i < opts.length; i++) {
    const ch = opts[i];
    if (inStr) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inStr = ch;
      continue;
    }
    if (ch === "{" || ch === "[" || ch === "(") depth++;
    else if (ch === "}" || ch === "]" || ch === ")") {
      if (depth === 0) return opts.slice(start, i).trim();
      depth--;
    } else if (ch === "," && depth === 0) return opts.slice(start, i).trim();
  }
  return opts.slice(start).trim();
}

/** Best-effort extraction of top-level keys from an object literal string
 *  like `{ foo, bar: 1, baz: { nested: true }, ...spread }`. */
function extractTopLevelKeys(objLiteral: string): { keys: string[]; hasSpread: boolean } {
  const inner = objLiteral.replace(/^\s*\{/, "").replace(/\}\s*$/, "");
  const keys: string[] = [];
  let hasSpread = false;
  let depth = 0;
  let inStr: string | null = null;
  let buf = "";
  const flush = () => {
    const t = buf.trim();
    buf = "";
    if (!t) return;
    if (t.startsWith("...")) {
      hasSpread = true;
      return;
    }
    // shorthand `foo`, `foo: ...`, `'foo': ...`, `"foo": ...`, `[x]: ...`
    if (t.startsWith("[")) {
      hasSpread = true; // computed key — treat as unknown
      return;
    }
    const k = t.split(/[:=]/, 1)[0].trim().replace(/^['"`]|['"`]$/g, "");
    if (/^[A-Za-z_$][\w$]*$/.test(k)) keys.push(k);
  };
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (inStr) {
      buf += ch;
      if (ch === "\\") {
        buf += inner[++i] ?? "";
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inStr = ch;
      buf += ch;
      continue;
    }
    if (ch === "{" || ch === "[" || ch === "(") {
      depth++;
      buf += ch;
      continue;
    }
    if (ch === "}" || ch === "]" || ch === ")") {
      depth--;
      buf += ch;
      continue;
    }
    if (ch === "," && depth === 0) {
      flush();
      continue;
    }
    buf += ch;
  }
  flush();
  return { keys, hasSpread };
}

interface CallDetect {
  method: HttpMethod;
  hasBody: boolean;
  hasHeaders: boolean;
  bodyKeys: string[];
  bodyHasSpread: boolean;
}

/** True when the opts object literal contains `key` as either `key: ...` or
 *  the shorthand `{ key }` form. We pre-parse top-level keys via the same
 *  brace-walker we use for body keys. */
function hasTopLevelOptionKey(opts: string, key: string): boolean {
  const { keys } = extractTopLevelKeys(opts.startsWith("{") ? opts : `{${opts}}`);
  return keys.includes(key);
}

function detectInvokeCallSite(opts: string | undefined): CallDetect {
  if (!opts)
    return { method: "POST", hasBody: false, hasHeaders: false, bodyKeys: [], bodyHasSpread: false };
  const bodyVal = extractKeyValue(opts, "body");
  const hasBody = bodyVal !== null || hasTopLevelOptionKey(opts, "body");
  const hasHeaders =
    extractKeyValue(opts, "headers") !== null || hasTopLevelOptionKey(opts, "headers");
  const methodVal = extractKeyValue(opts, "method");
  let method: HttpMethod = "POST";
  if (methodVal) {
    const m = methodVal.match(/['"`]([A-Z]+)['"`]/);
    if (m) method = m[1] as HttpMethod;
  }
  let bodyKeys: string[] = [];
  let bodyHasSpread = false;
  if (bodyVal && bodyVal.trim().startsWith("{")) {
    const ext = extractTopLevelKeys(bodyVal);
    bodyKeys = ext.keys;
    bodyHasSpread = ext.hasSpread;
  } else if (bodyVal) {
    // body is a variable / function call — keys are unknown.
    bodyHasSpread = true;
  }
  return { method, hasBody, hasHeaders, bodyKeys, bodyHasSpread };
}

function detectFetchCallSite(opts: string | undefined): CallDetect {
  if (!opts)
    return { method: "GET", hasBody: false, hasHeaders: false, bodyKeys: [], bodyHasSpread: false };
  const methodVal = extractKeyValue(opts, "method");
  let method: HttpMethod = "GET";
  if (methodVal) {
    const m = methodVal.match(/['"`]([A-Z]+)['"`]/);
    if (m) method = m[1] as HttpMethod;
  }
  const bodyVal = extractKeyValue(opts, "body");
  const hasBody = bodyVal !== null || hasTopLevelOptionKey(opts, "body");
  const hasHeaders =
    extractKeyValue(opts, "headers") !== null || hasTopLevelOptionKey(opts, "headers");
  let bodyKeys: string[] = [];
  let bodyHasSpread = false;
  if (bodyVal) {
    // `body: JSON.stringify({ ... })` is the common idiom.
    const stringifyMatch = bodyVal.match(/JSON\.stringify\s*\(\s*(\{[\s\S]*\})\s*\)/);
    const literal = stringifyMatch?.[1] ?? (bodyVal.trim().startsWith("{") ? bodyVal : null);
    if (literal) {
      const ext = extractTopLevelKeys(literal);
      bodyKeys = ext.keys;
      bodyHasSpread = ext.hasSpread;
    } else {
      bodyHasSpread = true;
    }
  }
  return { method, hasBody, hasHeaders, bodyKeys, bodyHasSpread };
}

/** Returns true when position `pos` falls inside a string or template literal
 *  on its line. We scan the line up to `pos` counting unescaped quote chars
 *  and report when we're in an unterminated string. Sufficient for filtering
 *  doc-string mentions like `detail: "Calls supabase.functions.invoke('foo')"`.
 */
function isInsideStringLiteral(text: string, pos: number): boolean {
  let lineStart = pos;
  while (lineStart > 0 && text[lineStart - 1] !== "\n") lineStart--;
  let inStr: string | null = null;
  for (let i = lineStart; i < pos; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") inStr = ch;
  }
  return inStr !== null;
}

function scanFile(file: string): CallSite[] {
  const text = fs.readFileSync(file, "utf8");
  const rel = path.relative(ROOT, file);
  const sites: CallSite[] = [];
  const fetchUrlIndices: Array<{ line: number; fn: string }> = [];

  // 1) functions.invoke('name', { ... })
  INVOKE_HEAD_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = INVOKE_HEAD_RE.exec(text))) {
    if (isInsideStringLiteral(text, m.index)) continue;
    const headEnd = m.index + m[0].length;
    // Find the comma or closing paren that follows the function name string.
    let i = headEnd;
    while (i < text.length && /\s/.test(text[i])) i++;
    let optsBlock: string | undefined;
    if (text[i] === ",") {
      // Argument 2 begins; capture object literal if next non-ws is `{`.
      i++;
      while (i < text.length && /\s/.test(text[i])) i++;
      if (text[i] === "{") {
        // Brace-balanced extraction of the object literal.
        let depth = 0;
        let inStr: string | null = null;
        for (let j = i; j < text.length; j++) {
          const ch = text[j];
          if (inStr) {
            if (ch === "\\") {
              j++;
              continue;
            }
            if (ch === inStr) inStr = null;
            continue;
          }
          if (ch === '"' || ch === "'" || ch === "`") {
            inStr = ch;
            continue;
          }
          if (ch === "{") depth++;
          else if (ch === "}") {
            depth--;
            if (depth === 0) {
              optsBlock = text.slice(i, j + 1);
              break;
            }
          }
        }
      }
    }
    const { line, column } = lineColOf(text, m.index);
    const det = detectInvokeCallSite(optsBlock);
    sites.push({
      file: rel,
      line,
      column,
      fn: m[2],
      kind: "invoke",
      method: det.method,
      hasBody: det.hasBody,
      hasHeaders: det.hasHeaders,
      bodyKeys: det.bodyKeys,
      bodyHasSpread: det.bodyHasSpread,
      snippet: snippetAt(text, m.index),
    });
  }

  // 2) fetch(<url>, <opts>) — extract the full call args via brace
  //    balancing, then look for /functions/v1/<name> in the URL argument.
  FETCH_HEAD_RE.lastIndex = 0;
  while ((m = FETCH_HEAD_RE.exec(text))) {
    if (isInsideStringLiteral(text, m.index)) continue;
    const openParen = m.index + m[0].length - 1;
    const args = extractCallArgs(text, openParen);
    if (!args) continue;
    const urlMatch = args.match(/\/functions\/v1\/([a-zA-Z0-9_-]+)/);
    if (!urlMatch) continue;
    const fn = urlMatch[1];
    // Split args at top-level comma to isolate options object (if any).
    let depth = 0;
    let inStr: string | null = null;
    let splitAt = -1;
    for (let j = 0; j < args.length; j++) {
      const ch = args[j];
      if (inStr) {
        if (ch === "\\") {
          j++;
          continue;
        }
        if (ch === inStr) inStr = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") {
        inStr = ch;
        continue;
      }
      if (ch === "(" || ch === "[" || ch === "{") depth++;
      else if (ch === ")" || ch === "]" || ch === "}") depth--;
      else if (ch === "," && depth === 0) {
        splitAt = j;
        break;
      }
    }
    const optsBlock = splitAt >= 0 ? args.slice(splitAt + 1).trim() : undefined;
    const det = detectFetchCallSite(optsBlock);
    const { line, column } = lineColOf(text, m.index);
    sites.push({
      file: rel,
      line,
      column,
      fn,
      kind: "fetch",
      method: det.method,
      hasBody: det.hasBody,
      hasHeaders: det.hasHeaders,
      bodyKeys: det.bodyKeys,
      bodyHasSpread: det.bodyHasSpread,
      snippet: snippetAt(text, m.index),
    });
    fetchUrlIndices.push({ line, fn });
  }

  // 3) Bare /functions/v1/<name> string references that are NOT inside a
  //    `fetch()` call already captured above. Recorded as `url-ref` so the
  //    function is counted as referenced but is exempt from method/body/
  //    auth contract checks (the actual HTTP call happens elsewhere).
  const seenFetch = new Set(fetchUrlIndices.map((r) => `${r.line}:${r.fn}`));
  URL_V1_RE.lastIndex = 0;
  while ((m = URL_V1_RE.exec(text))) {
    const { line, column } = lineColOf(text, m.index);
    const key = `${line}:${m[1]}`;
    if (seenFetch.has(key)) continue;
    sites.push({
      file: rel,
      line,
      column,
      fn: m[1],
      kind: "url-ref",
      method: "OPTIONS", // sentinel; never compared against contract methods
      hasBody: false,
      hasHeaders: false,
      bodyKeys: [],
      bodyHasSpread: false,
      snippet: snippetAt(text, m.index),
    });
  }

  return sites;
}

function inferHandlerMethods(src: string): {
  methods: HttpMethod[] | null;
  requiresJsonBody: boolean;
} {
  // We only treat the handler as "method-gated" when there is an explicit
  // non-OPTIONS method literal in source (`req.method === 'POST'`,
  // `req.method !== 'POST'`, `case 'GET':` inside a switch on req.method,
  // etc). If none exist, the handler passes any method through — return
  // null so we don't invent false constraints.
  const gated = new Set<HttpMethod>();
  for (const re of [
    /req\.method\s*===?\s*['"`]([A-Z]+)['"`]/g,
    /req\.method\s*!==?\s*['"`]([A-Z]+)['"`]/g,
  ]) {
    let mm: RegExpExecArray | null;
    while ((mm = re.exec(src))) {
      const v = mm[1] as HttpMethod;
      if (v !== "OPTIONS") gated.add(v);
    }
  }
  // Match `case 'POST':` only when within a switch on req.method. We
  // accept it as a signal if the source has both `switch (req.method)` and
  // case literals.
  if (/switch\s*\(\s*req\.method\s*\)/.test(src)) {
    const re = /case\s+['"`]([A-Z]+)['"`]\s*:/g;
    let mm: RegExpExecArray | null;
    while ((mm = re.exec(src))) {
      const v = mm[1] as HttpMethod;
      if (v !== "OPTIONS") gated.add(v);
    }
  }

  const reqJson = /req\s*\.\s*json\s*\(\s*\)/.test(src);
  const reqJsonCatch =
    /req\s*\.\s*json\s*\(\s*\)\s*\.\s*catch\s*\(/.test(src) ||
    /await\s+req\s*\.\s*json\s*\(\s*\)\s*\.\s*catch\s*\(/.test(src);
  const requiresJsonBody = reqJson && !reqJsonCatch;

  if (gated.size === 0) {
    // Ungated handler: any method is accepted. Surface null so callers
    // know not to enforce a method check.
    return { methods: null, requiresJsonBody };
  }
  // OPTIONS preflight is always implicitly allowed (the universal
  // short-circuit at the top of every handler in this codebase).
  gated.add("OPTIONS");
  return {
    methods: [...gated].sort() as HttpMethod[],
    requiresJsonBody,
  };
}

function listFunctionsOnDisk(contracts: Record<string, unknown>): FunctionInfo[] {
  if (!fs.existsSync(FUNCTIONS_DIR)) return [];
  return fs
    .readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
    .map((e) => e.name)
    .sort()
    .map<FunctionInfo>((name) => {
      const idx = path.join(FUNCTIONS_DIR, name, "index.ts");
      const hasIndex = fs.existsSync(idx);
      const hasContract = name in contracts;
      if (!hasIndex) {
        return { name, hasIndex, methods: null, requiresJsonBody: false, hasContract };
      }
      const src = fs.readFileSync(idx, "utf8");
      const { methods, requiresJsonBody } = inferHandlerMethods(src);
      return { name, hasIndex, methods, requiresJsonBody, hasContract };
    });
}

/** Read the call site's surrounding code (~6 lines after) and decide whether
 *  the caller exhibits any error-handling intent. We accept any of:
 *   - destructured `error` variable from the awaited call
 *   - `if (error)` / `if (!error)` near the call
 *   - `.catch(` chained on the call expression
 *   - the call is wrapped in a `try {` block (we look up to ~10 lines back)
 *  This is intentionally permissive — false negatives hurt more than false
 *  positives because errors-not-handled is a warning class, not a hard fail.
 */
/** Static scan for response field accesses near the call site that are not
 *  declared in the contract. Recognises:
 *   - `const { a, b } = data` / `await ...invoke(...)` destructuring
 *   - `data.foo` / `result.foo` / `res.foo` member access
 *  We skip standard wrapper fields (`data`, `error`, `status`) used by the
 *  Supabase JS client envelope itself. Returns the set of undeclared field
 *  names (deduped). Soft-warning, never fails CI by itself.
 */
function scanUndeclaredResponseFields(
  file: string,
  line: number,
  declared: string[],
): string[] {
  try {
    const text = fs.readFileSync(path.join(ROOT, file), "utf8");
    const lines = text.split(/\n/);
    // Look back up to 4 lines for the assignment that wraps this invoke call
    // (the invoke may sit on its own line after `const { data, error } = await`).
    const headStart = Math.max(0, line - 5);
    const headEnd = Math.min(lines.length, line + 2);
    const head = lines.slice(headStart, headEnd).join("\n");

    // Identify the binding(s) for the response of THIS invoke/fetch call only.
    // Patterns supported (captured groups: 1=destructured names, 2=identifier binding):
    //   const { data, error } = await X.invoke(...)
    //   const data = await X.invoke(...)
    //   const res = await fetch(...)
    const bindings: string[] = [];
    const destructHeadRe =
      /const\s*\{\s*([^}]+)\s*\}\s*=\s*await\s+[^;]*?\b(?:invoke|fetch)\s*\(/g;
    const aliasHeadRe =
      /const\s+([A-Za-z_$][\w$]*)\s*=\s*await\s+[^;]*?\b(?:invoke|fetch)\s*\(/g;
    let hm: RegExpExecArray | null;
    while ((hm = destructHeadRe.exec(head))) {
      for (const part of hm[1].split(",")) {
        const k = part.trim().split(/[:=]/, 1)[0].trim();
        // For destructure-from-invoke, `data` is the response payload binding.
        if (k === "data") bindings.push("data");
      }
    }
    while ((hm = aliasHeadRe.exec(head))) {
      bindings.push(hm[1]);
    }
    if (bindings.length === 0) return [];

    const found = new Set<string>();
    const ignore = new Set([
      "data",
      "error",
      "status",
      "statusText",
      "ok",
      "headers",
      "body",
      "json",
      "text",
      "url",
      "type",
      "redirected",
    ]);

    // Search a forward window for reads of the bound identifier(s) only.
    const tailStart = line - 1;
    const tailEnd = Math.min(lines.length, line + 14);
    const tail = lines.slice(tailStart, tailEnd).join("\n");

    for (const b of bindings) {
      const safe = b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const accessRe = new RegExp(
        `\\b${safe}\\s*\\??\\.\\s*([A-Za-z_$][\\w$]*)`,
        "g",
      );
      let m: RegExpExecArray | null;
      while ((m = accessRe.exec(tail))) {
        const k = m[1];
        if (ignore.has(k)) continue;
        if (!declared.includes(k)) found.add(k);
      }
      const destructTailRe = new RegExp(
        `const\\s*\\{\\s*([^}]+)\\s*\\}\\s*=\\s*(?:await\\s+)?${safe}\\b`,
        "g",
      );
      while ((m = destructTailRe.exec(tail))) {
        for (const part of m[1].split(",")) {
          const k = part.trim().split(/[:=]/, 1)[0].trim();
          if (!k || ignore.has(k)) continue;
          if (!/^[A-Za-z_$][\w$]*$/.test(k)) continue;
          if (!declared.includes(k)) found.add(k);
        }
      }
    }
    return [...found].sort();
  } catch {
    return [];
  }
}

function hasErrorHandling(file: string, line: number): boolean {
  try {
    const text = fs.readFileSync(path.join(ROOT, file), "utf8");
    const lines = text.split(/\n/);
    const ctx = lines
      .slice(Math.max(0, line - 11), Math.min(lines.length, line + 25))
      .join("\n");
    if (/\bcatch\s*\(/.test(ctx)) return true;
    if (/\btry\s*\{/.test(ctx)) return true;
    if (/\berror\b/i.test(ctx)) return true;
    if (/\bres(ult)?\.ok\b/.test(ctx)) return true;
    if (/!response\.ok|response\.ok|\.status\s*[!=<>]=/.test(ctx)) return true;
    return false;
  } catch {
    return true; // be permissive on read errors
  }
}

async function loadManifest(): Promise<Record<string, { auth: string; rateLimit: boolean }>> {
  const file = path.join(FUNCTIONS_DIR, "_manifest.ts");
  if (!fs.existsSync(file)) return {};
  try {
    const mod = await import(file);
    return (mod.EDGE_FUNCTION_MANIFEST ?? {}) as Record<string, { auth: string; rateLimit: boolean }>;
  } catch {
    return {};
  }
}

interface ContractEntry {
  methods: HttpMethod[];
  requestBody?: { required: string[]; optional?: string[] };
  response?: { fields: string[]; successStatuses?: number[] };
  errors?: Array<{ status: number; code?: string; reason: string }>;
  requireAuthHeader?: boolean;
  note?: string;
}

async function loadContracts(): Promise<Record<string, ContractEntry>> {
  const file = path.join(FUNCTIONS_DIR, "_contracts.ts");
  if (!fs.existsSync(file)) return {};
  try {
    const mod = await import(file);
    return (mod.EDGE_FUNCTION_CONTRACTS ?? {}) as Record<string, ContractEntry>;
  } catch (err) {
    console.warn("Failed to load _contracts.ts:", err);
    return {};
  }
}

function verifyCallSite(
  c: CallSite,
  info: FunctionInfo | undefined,
  contract: ContractEntry | undefined,
  manifest: Record<string, { auth: string; rateLimit: boolean }>,
): { mismatches: Mismatch[]; verified: boolean } {
  if (!info) return { mismatches: [], verified: false }; // orphan handled separately
  const out: Mismatch[] = [];
  const callerLoc = `${c.file}:${c.line}`;
  let verified = false;

  // url-ref call sites (bare /functions/v1/<name> string constants) are
  // not real HTTP calls — the actual fetch happens elsewhere. Skip all
  // contract enforcement for them; they only count as "function referenced".
  if (c.kind === "url-ref") return { mismatches: out, verified: false };

  // Every real (invoke/fetch) call to an existing function gets verified
  // against multiple axes: existence (already passed by entering this
  // branch with info defined), method, body-presence, auth posture, and
  // — when an explicit contract exists — body-fields and error-handling.
  verified = true;

  // ─── Body presence vs handler expectation ─────────────────────────────
  // If the handler unconditionally calls `await req.json()` (no .catch
  // fallback), but the caller didn't send a body, the function will throw
  // "Unexpected end of JSON input" at runtime. Hard fail.
  if (info.requiresJsonBody && !c.hasBody) {
    out.push({
      kind: "missing-body",
      fn: c.fn,
      caller: callerLoc,
      detail: `handler calls req.json() without a fallback but caller sent no body`,
    });
  }

  // ─── Method compatibility ─────────────────────────────────────────────
  // Effective accepted methods = explicit contract.methods (preferred)
  // ∪ inferred handler.methods. Either source is enough to enforce.
  const explicit = contract?.methods
    ? [...new Set([...contract.methods, "OPTIONS" as HttpMethod])]
    : null;
  const inferred = info.methods; // null = handler ungated, accepts any
  const accepted: HttpMethod[] | null =
    explicit ?? (inferred ? [...new Set([...inferred, "OPTIONS"])] : null);
  if (accepted) {
    verified = true;
    if (!accepted.includes(c.method)) {
      out.push({
        kind: "method",
        fn: c.fn,
        caller: callerLoc,
        detail: `caller uses ${c.method} but ${
          explicit ? "contract" : "handler"
        } accepts ${accepted.join(",")}`,
      });
    }
  }

  // ─── Required body fields (explicit contract only) ────────────────────
  if (
    contract?.requestBody?.required &&
    c.hasBody &&
    !c.bodyHasSpread &&
    c.bodyKeys.length > 0
  ) {
    verified = true;
    for (const req of contract.requestBody.required) {
      if (!c.bodyKeys.includes(req)) {
        out.push({
          kind: "missing-field",
          fn: c.fn,
          caller: callerLoc,
          detail: `body missing required field '${req}' (caller has: ${c.bodyKeys.join(", ") || "—"})`,
        });
      }
    }
  }

  // ─── Auth-header for raw fetch() to JWT-protected functions ───────────
  // `functions.invoke` automatically attaches the session bearer, so it's
  // exempt. For `fetch()`, the requirement is derived from the security
  // manifest INDEPENDENTLY of contract presence (an explicit contract may
  // override either way via requireAuthHeader). We assert not just that
  // a `headers:` option is present but that an `Authorization: Bearer …`
  // (or equivalent x-supabase-auth / apikey) appears in the literal so
  // generic `Content-Type`-only headers don't pass.
  if (c.kind === "fetch") {
    const manifestAuth = manifest[c.fn]?.auth;
    const manifestSaysAuth = manifestAuth === "jwt" || manifestAuth === "service_role";
    const requireAuth =
      contract?.requireAuthHeader !== undefined
        ? contract.requireAuthHeader
        : manifestSaysAuth;
    if (requireAuth) {
      verified = true;
      const snippet = c.snippet ?? "";
      const hasBearer =
        /Authorization\s*:\s*[`"']?\s*Bearer/i.test(snippet) ||
        /apikey\s*:/i.test(snippet) ||
        /x-supabase-auth/i.test(snippet) ||
        /Authorization/.test(snippet);
      if (!c.hasHeaders || !hasBearer) {
        out.push({
          kind: "missing-auth-header",
          fn: c.fn,
          caller: callerLoc,
          detail: `fetch() to ${manifestAuth ?? "auth-required"} function ${
            c.hasHeaders ? "has headers but no Authorization/Bearer/apikey" : "has no headers option"
          } (Authorization required)`,
        });
      }
    }
  }

  // ─── Response shape: warn when caller destructures undeclared fields ──
  // Statically scan ~12 lines after the call for `const { a, b } = data`
  // / `result.foo` / `data.foo` patterns. If the field is not listed in
  // `contract.response.fields`, surface as a warning (does not fail CI).
  if (contract?.response?.fields && contract.response.fields.length > 0) {
    verified = true;
    const undeclared = scanUndeclaredResponseFields(c.file, c.line, contract.response.fields);
    for (const field of undeclared) {
      out.push({
        kind: "undeclared-response-field",
        fn: c.fn,
        caller: callerLoc,
        detail: `caller reads response field '${field}' which is not declared in contract.response.fields=[${contract.response.fields.join(", ")}]`,
      });
    }
  }

  // ─── Error handling at the call site (warning, not hard fail) ─────────
  // When the function declares an `errors:` contract, every call site MUST
  // visibly handle errors (try/catch, .catch, or destructured `error`).
  // We never fail CI on this — it's surfaced as a warning class so teams
  // can clean up incrementally.
  if (contract?.errors && contract.errors.length > 0) {
    verified = true;
    if (!hasErrorHandling(c.file, c.line)) {
      out.push({
        kind: "unhandled-errors",
        fn: c.fn,
        caller: callerLoc,
        detail: `call site shows no error-handling pattern (try/catch, .catch, or destructured error) for a function with declared error contract`,
      });
    }
  }

  return { mismatches: out, verified };
}

function buildMatrix(
  callSites: CallSite[],
  fns: FunctionInfo[],
  manifest: Record<string, { auth: string; rateLimit: boolean }>,
  contracts: Record<string, ContractEntry>,
): Matrix {
  const fnByName = new Map(fns.map((f) => [f.name, f]));
  const callsByFn = new Map<string, CallSite[]>();
  for (const c of callSites) {
    if (!callsByFn.has(c.fn)) callsByFn.set(c.fn, []);
    callsByFn.get(c.fn)!.push(c);
  }

  const targetNames = new Set(callSites.map((c) => c.fn));
  const entries: MatrixEntry[] = [];

  let methodMismatches = 0;
  let missingFieldMismatches = 0;
  let missingBodyMismatches = 0;
  let missingAuthHeaderMismatches = 0;
  let unhandledErrorsWarnings = 0;
  let undeclaredResponseFieldWarnings = 0;
  let verifiedCallSites = 0;

  for (const name of [...targetNames].sort()) {
    const info = fnByName.get(name);
    if (info) {
      info.manifestAuth = manifest[name]?.auth;
      info.manifestRateLimit = manifest[name]?.rateLimit;
    }
    const contract = contracts[name];
    const callers = (callsByFn.get(name) ?? []).sort(
      (a, b) => a.file.localeCompare(b.file) || a.line - b.line,
    );
    const mismatches: Mismatch[] = [];
    for (const c of callers) {
      const v = verifyCallSite(c, info, contract, manifest);
      mismatches.push(...v.mismatches);
      if (v.verified) verifiedCallSites++;
    }
    for (const m of mismatches) {
      if (m.kind === "method") methodMismatches++;
      else if (m.kind === "missing-field") missingFieldMismatches++;
      else if (m.kind === "missing-body") missingBodyMismatches++;
      else if (m.kind === "missing-auth-header") missingAuthHeaderMismatches++;
      else if (m.kind === "unhandled-errors") unhandledErrorsWarnings++;
      else if (m.kind === "undeclared-response-field") undeclaredResponseFieldWarnings++;
    }
    entries.push({
      fn: name,
      exists: !!info,
      callers,
      info,
      contractFields: contract?.requestBody?.required,
      contractMethods: contract?.methods,
      mismatches,
    });
  }

  const orphanedFunctions = fns.filter((f) => !targetNames.has(f.name)).map((f) => f.name);
  const orphanedFrontend = entries.filter((e) => !e.exists).length;

  const declaredContracts = Object.keys(contracts).length;
  const referencedDeclared = [...targetNames].filter((n) => n in contracts).length;
  const coveragePct =
    targetNames.size === 0 ? 0 : (referencedDeclared / targetNames.size) * 100;

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      callSites: callSites.length,
      verifiedCallSites,
      uniqueTargets: targetNames.size,
      functionsOnDisk: fns.length,
      declaredContracts,
      contractCoverage: `${referencedDeclared}/${targetNames.size} (${coveragePct.toFixed(1)}%)`,
      orphanedFrontendCalls: orphanedFrontend,
      orphanedEdgeFunctions: orphanedFunctions.length,
      methodMismatches,
      missingFieldMismatches,
      missingBodyMismatches,
      missingAuthHeaderMismatches,
      unhandledErrorsWarnings,
      undeclaredResponseFieldWarnings,
    },
    entries,
    orphanedFunctions,
  };
}

function renderMarkdown(matrix: Matrix): string {
  const lines: string[] = [];
  lines.push("# Frontend ↔ Edge Function Contract Matrix");
  lines.push("");
  lines.push("_Generated by `scripts/edge-function-contract-matrix.ts`. Do not edit by hand._");
  lines.push("");
  lines.push(`Generated: ${matrix.generatedAt}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  const verifiedPct =
    matrix.totals.callSites === 0
      ? 0
      : (matrix.totals.verifiedCallSites / matrix.totals.callSites) * 100;
  lines.push(`- Total frontend call sites: **${matrix.totals.callSites}**`);
  lines.push(
    `- Call sites with at least one contract assertion run: **${matrix.totals.verifiedCallSites}/${matrix.totals.callSites} (${verifiedPct.toFixed(1)}%)**`,
  );
  lines.push(`- Unique target functions referenced: **${matrix.totals.uniqueTargets}**`);
  lines.push(`- Edge functions on disk: **${matrix.totals.functionsOnDisk}**`);
  lines.push(`- Declared contracts (\`_contracts.ts\`): **${matrix.totals.declaredContracts}**`);
  lines.push(`- Explicit contract coverage of referenced functions: **${matrix.totals.contractCoverage}**`);
  lines.push(`- **Orphaned frontend calls** (no matching function): **${matrix.totals.orphanedFrontendCalls}**`);
  lines.push(`- **Method mismatches** (explicit contracts + inferred handler gates): **${matrix.totals.methodMismatches}**`);
  lines.push(`- **Missing required body fields** (declared contracts): **${matrix.totals.missingFieldMismatches}**`);
  lines.push(`- **Missing body when handler requires JSON** (inferred from \`req.json()\` without fallback): **${matrix.totals.missingBodyMismatches}**`);
  lines.push(`- **Missing Authorization on fetch() to auth-required functions** (manifest-derived): **${matrix.totals.missingAuthHeaderMismatches}**`);
  lines.push(`- _Unhandled-errors warnings_ (callers of functions with declared error contracts that show no try/catch/error handling): **${matrix.totals.unhandledErrorsWarnings}**`);
  lines.push(`- _Undeclared-response-field warnings_ (caller reads a field not in \`response.fields\`): **${matrix.totals.undeclaredResponseFieldWarnings}**`);
  lines.push(`- Orphaned edge functions (no caller in \`src/\`): **${matrix.totals.orphanedEdgeFunctions}**`);
  lines.push("");
  lines.push("### Verification scope");
  lines.push("");
  lines.push(
    "Every call site is verified against either an **explicit** entry in `supabase/functions/_contracts.ts` OR the **inferred** handler contract derived from `index.ts` (method gate + manifest auth posture). A call site is counted as _verified_ when at least one assertion was actually run against it. `url-ref` rows (bare URL constants like `\\`/functions/v1/foo\\``) are inventoried but not asserted — they are not real HTTP calls.",
  );
  lines.push("");
  lines.push(
    "**What is NOT statically validated**: response payload shapes (would require runtime fixture replay) and exhaustive error-code matching (we only check that callers exhibit error-handling intent when an `errors:` contract is declared). These remain warnings rather than hard failures.",
  );
  lines.push("");

  const HARD_KINDS = new Set<Mismatch["kind"]>([
    "orphan",
    "method",
    "missing-field",
    "missing-body",
    "missing-auth-header",
  ]);
  const blocking: Mismatch[] = [];
  const warnings: Mismatch[] = [];
  for (const e of matrix.entries) {
    if (!e.exists) {
      for (const c of e.callers) {
        blocking.push({
          kind: "orphan",
          fn: e.fn,
          caller: `${c.file}:${c.line}`,
          detail: `${c.kind} ${c.method} — function does not exist on disk`,
        });
      }
    }
    for (const m of e.mismatches) {
      if (HARD_KINDS.has(m.kind)) blocking.push(m);
      else warnings.push(m);
    }
  }

  if (blocking.length) {
    lines.push("## Blocking mismatches (CI fails)");
    lines.push("");
    lines.push("Kinds that fail CI: `orphan`, `method`, `missing-field`, `missing-body`, `missing-auth-header`.");
    lines.push("");
    lines.push("| Kind | Function | Caller | Detail |");
    lines.push("| --- | --- | --- | --- |");
    for (const b of blocking) {
      lines.push(`| ${b.kind} | \`${b.fn}\` | \`${b.caller}\` | ${b.detail} |`);
    }
    lines.push("");
  }

  if (warnings.length) {
    lines.push("## Warnings (non-blocking)");
    lines.push("");
    lines.push(
      "These categories are surfaced for follow-up but do **not** fail CI today: `unhandled-errors` (caller of a function with declared errors lacks visible error-handling) and `undeclared-response-field` (caller reads a field not in `response.fields`). Tightening them to hard failures is tracked under follow-up #904 (runtime fixture replay).",
    );
    lines.push("");
    lines.push("| Kind | Function | Caller | Detail |");
    lines.push("| --- | --- | --- | --- |");
    for (const w of warnings) {
      lines.push(`| ${w.kind} | \`${w.fn}\` | \`${w.caller}\` | ${w.detail} |`);
    }
    lines.push("");
  }

  lines.push("## Contract matrix");
  lines.push("");
  lines.push("| Function | On disk | Contract | Methods (handler) | Required body | Auth (manifest) | Rate-limited | Callers | Mismatches |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const e of matrix.entries) {
    const methods = e.info?.methods === null ? "any" : e.info?.methods?.join(",") || "—";
    const auth = e.info?.manifestAuth ?? (e.exists ? "_unclassified_" : "—");
    const rl =
      e.info?.manifestRateLimit === undefined ? "—" : e.info.manifestRateLimit ? "yes" : "no";
    const contractCol = e.contractMethods ? `${e.contractMethods.join(",")}` : "—";
    const reqFields = e.contractFields?.join(", ") || "—";
    lines.push(
      `| \`${e.fn}\` | ${e.exists ? "✓" : "**MISSING**"} | ${contractCol} | ${methods} | ${reqFields} | ${auth} | ${rl} | ${e.callers.length} | ${e.mismatches.length || "—"} |`,
    );
  }
  lines.push("");

  lines.push("## Call sites (detail)");
  lines.push("");
  for (const e of matrix.entries) {
    lines.push(`### \`${e.fn}\`${e.exists ? "" : " — **MISSING ON DISK**"}`);
    if (e.contractFields) {
      lines.push(`- _contract requires_: \`${e.contractFields.join("`, `")}\``);
    }
    lines.push("");
    for (const c of e.callers) {
      const meta = [
        c.kind,
        c.method,
        c.hasBody ? "body" : "no-body",
        c.hasHeaders ? "headers" : "no-headers",
        c.bodyKeys.length ? `keys=[${c.bodyKeys.join(",")}]` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      lines.push(`- \`${c.file}:${c.line}\` — ${meta}`);
    }
    if (e.mismatches.length) {
      lines.push("");
      for (const m of e.mismatches) {
        lines.push(`  - **${m.kind}** at \`${m.caller}\`: ${m.detail}`);
      }
    }
    lines.push("");
  }

  if (matrix.orphanedFunctions.length) {
    lines.push("## Orphaned edge functions (no frontend caller)");
    lines.push("");
    lines.push("These functions exist on disk but are not invoked from `src/`. ");
    lines.push("They may be cron-only, webhook-only, or candidates for the consolidation effort (#226).");
    lines.push("");
    for (const n of matrix.orphanedFunctions) lines.push(`- \`${n}\``);
    lines.push("");
  }

  return lines.join("\n");
}

function stableJson(matrix: Matrix): string {
  const replacer = (_key: string, value: unknown) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(value as Record<string, unknown>).sort()) {
        sorted[k] = (value as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return value;
  };
  // Drop generatedAt so the artifact is stable across runs; CI compares
  // structure, not timestamp.
  const { generatedAt: _ignore, ...rest } = matrix;
  return JSON.stringify(rest, replacer, 2) + "\n";
}

async function main() {
  const ci = process.argv.includes("--ci");

  const files = walk(SRC_DIR);
  const allSites: CallSite[] = [];
  for (const f of files) allSites.push(...scanFile(f));

  const contracts = await loadContracts();
  const fns = listFunctionsOnDisk(contracts);
  const manifest = await loadManifest();
  const matrix = buildMatrix(allSites, fns, manifest, contracts);

  fs.mkdirSync(DOCS_DIR, { recursive: true });
  const md = renderMarkdown(matrix);
  const json = stableJson(matrix);

  if (ci) {
    const prevMd = fs.existsSync(MD_OUT) ? fs.readFileSync(MD_OUT, "utf8") : "";
    const prevJson = fs.existsSync(JSON_OUT) ? fs.readFileSync(JSON_OUT, "utf8") : "";
    const stripTs = (s: string) => s.replace(/^Generated: .*$/m, "Generated: <ts>");
    const stale = stripTs(prevMd) !== stripTs(md) || prevJson !== json;
    const orphans = matrix.entries.filter((e) => !e.exists);

    let failed = false;
    if (orphans.length > 0) {
      console.error(`\n❌ ${orphans.length} orphaned frontend call(s) — function does not exist on disk:`);
      for (const e of orphans) {
        for (const c of e.callers) console.error(`   - ${e.fn}  ←  ${c.file}:${c.line}`);
      }
      failed = true;
    }
    if (matrix.totals.methodMismatches > 0) {
      console.error(`\n❌ ${matrix.totals.methodMismatches} method mismatch(es):`);
      for (const e of matrix.entries)
        for (const m of e.mismatches)
          if (m.kind === "method") console.error(`   - ${m.fn}  ←  ${m.caller}: ${m.detail}`);
      failed = true;
    }
    if (matrix.totals.missingFieldMismatches > 0) {
      console.error(`\n❌ ${matrix.totals.missingFieldMismatches} missing required body field(s):`);
      for (const e of matrix.entries)
        for (const m of e.mismatches)
          if (m.kind === "missing-field")
            console.error(`   - ${m.fn}  ←  ${m.caller}: ${m.detail}`);
      failed = true;
    }
    if (matrix.totals.missingBodyMismatches > 0) {
      console.error(`\n❌ ${matrix.totals.missingBodyMismatches} call(s) sending no body to a handler that requires JSON:`);
      for (const e of matrix.entries)
        for (const m of e.mismatches)
          if (m.kind === "missing-body")
            console.error(`   - ${m.fn}  ←  ${m.caller}: ${m.detail}`);
      failed = true;
    }
    if (matrix.totals.missingAuthHeaderMismatches > 0) {
      console.error(`\n❌ ${matrix.totals.missingAuthHeaderMismatches} fetch() call(s) to JWT functions missing Authorization:`);
      for (const e of matrix.entries)
        for (const m of e.mismatches)
          if (m.kind === "missing-auth-header")
            console.error(`   - ${m.fn}  ←  ${m.caller}: ${m.detail}`);
      failed = true;
    }
    if (stale) {
      console.error(
        "\n❌ Contract matrix artifact is stale. Run `npx tsx scripts/edge-function-contract-matrix.ts` and commit the regenerated docs.",
      );
      failed = true;
    }
    if (failed) process.exit(1);
    console.log(
      `✓ Contract matrix verified: ${matrix.totals.callSites} call sites → ${matrix.totals.uniqueTargets} functions, contract coverage ${matrix.totals.contractCoverage}, 0 mismatches.`,
    );
    return;
  }

  fs.writeFileSync(MD_OUT, md);
  fs.writeFileSync(JSON_OUT, json);
  console.log(`Wrote ${path.relative(ROOT, MD_OUT)}`);
  console.log(`Wrote ${path.relative(ROOT, JSON_OUT)}`);
  console.log(
    `Summary: ${matrix.totals.callSites} call sites (${matrix.totals.verifiedCallSites} verified) · ${matrix.totals.uniqueTargets} unique targets · ${matrix.totals.functionsOnDisk} on disk · contracts ${matrix.totals.contractCoverage} · orphans=${matrix.totals.orphanedFrontendCalls} method=${matrix.totals.methodMismatches} field=${matrix.totals.missingFieldMismatches} body=${matrix.totals.missingBodyMismatches} auth=${matrix.totals.missingAuthHeaderMismatches} unhandled-errors=${matrix.totals.unhandledErrorsWarnings} undeclared-response=${matrix.totals.undeclaredResponseFieldWarnings}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
