#!/usr/bin/env bash
# Read-only inventory of Supabase edge functions.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
OUT_DIR="$ROOT/docs/audit/phase-0/99-evidence"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/edge-functions.csv"
INVOKE_OUT="$OUT_DIR/edge-function-frontend-invokers.txt"
INVOKE_INDEX="$OUT_DIR/edge-function-invoker-counts.txt"
FUNCS_DIR="$ROOT/supabase/functions"

# 1. One single grep across src/ to collect every functions.invoke("name") callsite.
grep -RIn --include='*.ts' --include='*.tsx' \
  -E "functions\.invoke\(\s*[\"'\`][a-zA-Z0-9_-]+[\"'\`]" "$ROOT/src" 2>/dev/null \
  | sed -E "s|.*src/|src/|" \
  | sort -u > "$INVOKE_OUT.tmp"
{
  echo "# Frontend functions.invoke() callsites (file:line:match)"
  cat "$INVOKE_OUT.tmp"
} > "$INVOKE_OUT"

# 2. Build an aggregate name->count.
sed -nE "s|.*functions\.invoke\(\s*[\"'\`]([a-zA-Z0-9_-]+)[\"'\`].*|\1|p" "$INVOKE_OUT.tmp" \
  | sort | uniq -c | sort -rn > "$INVOKE_INDEX"
rm -f "$INVOKE_OUT.tmp"

echo "function_name,entry_point_exists,size_bytes,line_count,frontend_invoker_callsites" > "$OUT"
for d in "$FUNCS_DIR"/*/; do
  name="$(basename "$d")"
  entry="$d/index.ts"
  if [[ -f "$entry" ]]; then
    sz=$(wc -c <"$entry" | tr -d ' ')
    lc=$(wc -l <"$entry" | tr -d ' ')
    inv=$(awk -v n="$name" '$2==n {print $1; exit}' "$INVOKE_INDEX")
    inv=${inv:-0}
    echo "${name},true,${sz},${lc},${inv}" >> "$OUT"
  else
    echo "${name},false,0,0,0" >> "$OUT"
  fi
done

echo "Wrote $OUT, $INVOKE_OUT, $INVOKE_INDEX"
echo "Total functions: $(($(wc -l <"$OUT") - 1))"
