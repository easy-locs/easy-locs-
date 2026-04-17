/**
 * JsonDiffView — payload-shape-agnostic deep JSON diff renderer (#812).
 *
 * Walks two arbitrary values and produces a flat list of {path, kind,
 * before, after} entries. Kinds: `added`, `removed`, `changed`,
 * `unchanged`. Arrays are diffed positionally; primitives compared by
 * `Object.is` after JSON canonicalization.
 *
 * The diff is *generic* — it makes no assumptions about business
 * semantics. The same renderer handles a marketplace listing patch,
 * an AI router prompt change, and (in v2) a structured-policy change
 * proposed by a build agent.
 */
import { useMemo } from "react";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type JsonDiffKind = "added" | "removed" | "changed" | "unchanged";

export interface JsonDiffEntry {
  path: string;
  kind: JsonDiffKind;
  before: unknown;
  after: unknown;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    Object.getPrototypeOf(v) === Object.prototype
  );
}

function fmtScalar(v: unknown): string {
  if (v === undefined) return "—";
  if (v === null) return "null";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

export function diffJson(
  before: unknown,
  after: unknown,
  path = "$",
  out: JsonDiffEntry[] = [],
): JsonDiffEntry[] {
  if (Object.is(before, after)) {
    out.push({ path, kind: "unchanged", before, after });
    return out;
  }
  if (before === undefined) {
    out.push({ path, kind: "added", before, after });
    return out;
  }
  if (after === undefined) {
    out.push({ path, kind: "removed", before, after });
    return out;
  }
  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = Array.from(
      new Set([...Object.keys(before), ...Object.keys(after)]),
    ).sort();
    for (const k of keys) {
      diffJson(before[k], after[k], `${path}.${k}`, out);
    }
    return out;
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    const len = Math.max(before.length, after.length);
    for (let i = 0; i < len; i++) {
      diffJson(before[i], after[i], `${path}[${i}]`, out);
    }
    return out;
  }
  // Type mismatch or scalar change.
  if (JSON.stringify(before) === JSON.stringify(after)) {
    out.push({ path, kind: "unchanged", before, after });
  } else {
    out.push({ path, kind: "changed", before, after });
  }
  return out;
}

export function JsonDiffView({
  before,
  after,
  showUnchanged = false,
  className,
}: {
  before: unknown;
  after: unknown;
  showUnchanged?: boolean;
  className?: string;
}) {
  const entries = useMemo(() => diffJson(before, after), [before, after]);
  const visible = showUnchanged
    ? entries
    : entries.filter((e) => e.kind !== "unchanged");

  if (visible.length === 0) {
    return (
      <div
        className={cn(
          "text-xs italic text-muted-foreground py-3 text-center",
          className,
        )}
        data-testid="json-diff-empty"
      >
        No differences detected.
      </div>
    );
  }

  return (
    <div
      className={cn("space-y-1 text-[0.6875rem] font-mono", className)}
      data-testid="json-diff-view"
    >
      {visible.map((e) => (
        <div
          key={e.path}
          data-testid="json-diff-row"
          data-kind={e.kind}
          className={cn(
            "rounded border px-2 py-1 flex items-start gap-2",
            e.kind === "added" &&
              "border-success/30 bg-success/5 text-success-foreground",
            e.kind === "removed" &&
              "border-destructive/30 bg-destructive/5 text-destructive",
            e.kind === "changed" &&
              "border-warning/30 bg-warning/5 text-foreground",
            e.kind === "unchanged" &&
              "border-border/30 bg-muted/20 text-muted-foreground",
          )}
        >
          <span className="shrink-0 mt-0.5">
            {e.kind === "added" && <Plus className="w-3 h-3" />}
            {e.kind === "removed" && <Minus className="w-3 h-3" />}
            {e.kind === "changed" && <ArrowRight className="w-3 h-3" />}
            {e.kind === "unchanged" && (
              <span className="block w-3 h-3 rounded-full bg-muted/40" />
            )}
          </span>
          <span className="font-semibold shrink-0">{e.path}</span>
          <span className="ml-auto flex flex-wrap items-center gap-1 justify-end">
            {e.kind !== "added" && (
              <span className="line-through opacity-70 break-all">
                {fmtScalar(e.before)}
              </span>
            )}
            {e.kind === "changed" && (
              <ArrowRight className="w-3 h-3 opacity-60" />
            )}
            {e.kind !== "removed" && (
              <span className="break-all">{fmtScalar(e.after)}</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

export default JsonDiffView;
