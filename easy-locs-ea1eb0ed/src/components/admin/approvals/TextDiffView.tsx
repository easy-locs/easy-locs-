/**
 * TextDiffView — render a unified diff (#812).
 *
 * Used when `intent_payload.diff_kind === 'text'` (e.g. a future
 * `dev.builder` agent proposing a code patch). The reviewer sees the
 * exact same drawer they use for JSON payloads — only the renderer
 * changes. The unified diff is parsed minimally; we do NOT try to
 * re-implement a full diff library.
 */
import { cn } from "@/lib/utils";

export function TextDiffView({
  unifiedDiff,
  className,
}: {
  unifiedDiff: string;
  className?: string;
}) {
  const lines = unifiedDiff.split(/\r?\n/);
  if (lines.length === 0) {
    return (
      <div className={cn("text-xs italic text-muted-foreground", className)}>
        Empty diff.
      </div>
    );
  }
  return (
    <pre
      data-testid="text-diff-view"
      className={cn(
        "text-[0.625rem] font-mono bg-muted/40 border border-border/40 rounded-lg p-2 overflow-x-auto max-h-96 leading-relaxed",
        className,
      )}
    >
      {lines.map((l, i) => {
        const cls = l.startsWith("+++") || l.startsWith("---")
          ? "text-foreground font-semibold"
          : l.startsWith("@@")
            ? "text-info"
            : l.startsWith("+")
              ? "text-success bg-success/5 block px-1 -mx-1"
              : l.startsWith("-")
                ? "text-destructive bg-destructive/5 block px-1 -mx-1"
                : "text-muted-foreground";
        return (
          <span key={i} className={cls}>
            {l}
            {"\n"}
          </span>
        );
      })}
    </pre>
  );
}

export default TextDiffView;
