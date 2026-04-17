/**
 * ACP Agent 7 (#866) — DAG visualisation for tool calls inside a run.
 *
 * Inputs come from `AgentRunRichRow.tools_used` which is whatever the
 * agent recorded — a flat list, sometimes with `parent`/`step`/`order`
 * hints. We normalize to `ToolNode[]` and render a vertically stacked
 * graph: parents stay above their children with a left-aligned vertical
 * spine drawn between them. This is intentionally lightweight (no
 * `react-flow`) so it works in the admin shell without bundle bloat.
 */
import { useMemo } from "react";
import { ArrowDown, Wrench, Clock } from "lucide-react";

interface RawTool {
  [k: string]: unknown;
}

interface ToolNode {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  durationMs?: number | null;
  parent?: string | null;
  raw: RawTool;
}

function asRecord(x: unknown): RawTool | null {
  return x && typeof x === "object" ? (x as RawTool) : null;
}

function pickStr(rec: RawTool, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}

function pickNum(rec: RawTool, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function normalize(tools: unknown): ToolNode[] {
  if (!Array.isArray(tools)) return [];
  return tools.map((t, i) => {
    const rec = asRecord(t) ?? {};
    return {
      id: pickStr(rec, "id", "call_id", "tool_call_id") ?? `tool_${i}`,
      name: pickStr(rec, "name", "tool", "function") ?? `tool_${i}`,
      description: pickStr(rec, "description", "summary"),
      status: pickStr(rec, "status", "state", "outcome"),
      durationMs: pickNum(rec, "duration_ms", "latency_ms", "elapsed_ms"),
      parent: pickStr(rec, "parent", "parent_id", "parent_call_id"),
      raw: rec,
    };
  });
}

function statusTone(status: string | null | undefined): string {
  if (!status) return "bg-muted text-muted-foreground";
  if (/(success|ok|done|complete)/i.test(status)) return "bg-success/15 text-success";
  if (/(fail|error|reject)/i.test(status)) return "bg-destructive/15 text-destructive";
  if (/(run|pending|wait)/i.test(status)) return "bg-info/15 text-info";
  return "bg-muted text-muted-foreground";
}

export function ToolDag({ tools }: { tools: unknown }) {
  const nodes = useMemo(() => normalize(tools), [tools]);
  if (nodes.length === 0) {
    return (
      <div className="text-xs italic text-muted-foreground">
        No tool calls recorded for this run.
      </div>
    );
  }

  // Build adjacency. Nodes with no parent become roots, otherwise
  // attach to the named parent if it resolves, falling back to the
  // previous sibling so unrooted lists still render.
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childrenOf = new Map<string | null, ToolNode[]>();
  // First node always becomes a root; subsequent nodes attach to their
  // declared parent if it resolves, otherwise chain off the previous
  // node so flat tool arrays still render as a sequential DAG instead
  // of a row of disconnected roots.
  let prev: ToolNode | null = null;
  for (const n of nodes) {
    let parentId: string | null = null;
    if (n.parent && byId.has(n.parent) && n.parent !== n.id) {
      parentId = n.parent;
    } else if (prev) {
      parentId = prev.id;
    }
    const arr = childrenOf.get(parentId) ?? [];
    arr.push(n);
    childrenOf.set(parentId, arr);
    prev = n;
  }

  const roots = childrenOf.get(null) ?? [];

  function renderNode(node: ToolNode, depth: number, last: boolean) {
    const kids = childrenOf.get(node.id) ?? [];
    return (
      <div key={node.id} className="relative" style={{ paddingLeft: depth * 16 }}>
        <div className="flex items-start gap-2 py-1.5">
          <div className="mt-0.5 rounded border border-border/40 bg-card/80 p-1">
            <Wrench className="h-3 w-3 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <code className="font-mono text-xs text-foreground truncate">{node.name}</code>
              {node.status ? (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusTone(node.status)}`}>
                  {node.status}
                </span>
              ) : null}
              {node.durationMs != null ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  {node.durationMs < 1000
                    ? `${node.durationMs}ms`
                    : `${(node.durationMs / 1000).toFixed(2)}s`}
                </span>
              ) : null}
            </div>
            {node.description ? (
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {node.description}
              </div>
            ) : null}
          </div>
        </div>
        {!last ? (
          <div className="absolute left-3 top-7 bottom-0 w-px bg-border/60" aria-hidden />
        ) : null}
        {kids.length > 0 ? (
          <div className="ml-3 border-l border-dashed border-border/50 pl-2">
            {kids.map((k, i) => renderNode(k, depth + 1, i === kids.length - 1))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded border bg-muted/10 p-3">
      <div className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground mb-2">
        Tool DAG · {nodes.length} step{nodes.length === 1 ? "" : "s"}
        <ArrowDown className="h-3 w-3" />
      </div>
      <div className="space-y-0">
        {roots.map((r, i) => renderNode(r, 0, i === roots.length - 1))}
      </div>
    </div>
  );
}
