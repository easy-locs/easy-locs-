#!/usr/bin/env bash
# Read-only inventory of Supabase edge functions.
# Outputs (under docs/audit/phase-0/99-evidence/):
#   - edge-functions.csv                        (per-function stats)
#   - edge-function-frontend-invokers.txt       (single-line callsites only)
#   - edge-function-invoker-counts.txt          (count per function)
#   - edge-function-invoker-counts.csv          (function,count for joining)
#   - edge-function-call-graph.txt              (edge -> edge invocations / fetches)
#   - edge-function-call-graph-edges.csv        (caller,callee pairs)
#   - edge-function-shared-imports.txt          (edge -> _shared/* imports)
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
OUT_DIR="$ROOT/docs/audit/phase-0/99-evidence"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/edge-functions.csv"
INVOKE_OUT="$OUT_DIR/edge-function-frontend-invokers.txt"
INVOKE_INDEX="$OUT_DIR/edge-function-invoker-counts.txt"
INVOKE_CSV="$OUT_DIR/edge-function-invoker-counts.csv"
GRAPH_TXT="$OUT_DIR/edge-function-call-graph.txt"
GRAPH_CSV="$OUT_DIR/edge-function-call-graph-edges.csv"
SHARED_TXT="$OUT_DIR/edge-function-shared-imports.txt"
FUNCS_DIR="$ROOT/supabase/functions"

# ── 1. Collect every frontend functions.invoke("name") callsite (single-line only). ──
# Strict regex: literal name on the SAME line; ignores multi-line invocations
# where the name appears on a later line (those are recorded in the loose pass below).
grep -RIn --include='*.ts' --include='*.tsx' \
  -E "functions\.invoke\(\s*[\"'\`][a-zA-Z0-9_-]+[\"'\`]" "$ROOT/src" 2>/dev/null \
  | sed -E "s|.*src/|src/|" \
  | sort -u > "$INVOKE_OUT.tmp"
{
  echo "# Frontend functions.invoke() callsites (strict: name on same line)"
  echo "# Format: file:line:match"
  grep -E "^src/.*functions\.invoke\(\s*[\"'\`][a-zA-Z0-9_-]+[\"'\`]" "$INVOKE_OUT.tmp" || true
} > "$INVOKE_OUT"

# Loose pass: capture multi-line invocations and store separately for completeness.
grep -RIn --include='*.ts' --include='*.tsx' \
  -E "functions\.invoke\(" "$ROOT/src" 2>/dev/null \
  | sed -E "s|.*src/|src/|" \
  | grep -vE "functions\.invoke\(\s*[\"'\`][a-zA-Z0-9_-]+[\"'\`]" \
  | sort -u > "$OUT_DIR/edge-function-frontend-invokers-multiline.txt"

# ── 2. Build name -> count of strict callsites. ──
sed -nE "s|.*functions\.invoke\(\s*[\"'\`]([a-zA-Z0-9_-]+)[\"'\`].*|\1|p" "$INVOKE_OUT.tmp" \
  | sort | uniq -c | sort -rn > "$INVOKE_INDEX"
{
  echo "function_name,frontend_invoker_callsites"
  awk '{c=$1; $1=""; sub(/^ /,""); print $0","c}' "$INVOKE_INDEX"
} > "$INVOKE_CSV"
rm -f "$INVOKE_OUT.tmp"

# ── 3. Per-function stats CSV. ──
echo "function_name,entry_point_exists,size_bytes,line_count,frontend_invoker_callsites,internal_callers,shared_imports" > "$OUT"

# Pre-build internal caller map: caller_function -> callee_function name.
> "$GRAPH_CSV"
echo "caller,callee,kind" >> "$GRAPH_CSV"
> "$GRAPH_TXT"
> "$SHARED_TXT"

for d in "$FUNCS_DIR"/*/; do
  name="$(basename "$d")"
  entry="$d/index.ts"

  # Find inter-function invocations: functions.invoke("name"), fetch(".../functions/v1/name"), Deno.env.get("...") of urls.
  inv_callees=$(grep -RhEo "functions\.invoke\(\s*[\"'\`][a-zA-Z0-9_-]+[\"'\`]" "$d" 2>/dev/null \
    | sed -nE "s|.*[\"'\`]([a-zA-Z0-9_-]+)[\"'\`].*|\1|p" | sort -u)
  fetch_callees=$(grep -RhEo "/functions/v1/[a-zA-Z0-9_-]+" "$d" 2>/dev/null \
    | sed -nE "s|.*/functions/v1/([a-zA-Z0-9_-]+).*|\1|p" | sort -u)

  for c in $inv_callees; do
    [[ "$c" == "$name" ]] && continue
    echo "$name,$c,functions.invoke" >> "$GRAPH_CSV"
  done
  for c in $fetch_callees; do
    [[ "$c" == "$name" ]] && continue
    echo "$name,$c,fetch" >> "$GRAPH_CSV"
  done

  # Shared imports
  shared=$(grep -RhEo "from\s+[\"'\`][^\"'\`]*_shared/[^\"'\`]+[\"'\`]" "$d" 2>/dev/null \
    | sed -nE "s|.*[\"'\`]([^\"'\`]+)[\"'\`].*|\1|p" | sort -u)
  if [[ -n "$shared" ]]; then
    while IFS= read -r line; do
      echo "$name -> $line" >> "$SHARED_TXT"
    done <<< "$shared"
  fi

  if [[ -f "$entry" ]]; then
    sz=$(wc -c <"$entry" | tr -d ' ')
    lc=$(wc -l <"$entry" | tr -d ' ')
    inv=$(awk -v n="$name" '$2==n {print $1; exit}' "$INVOKE_INDEX")
    inv=${inv:-0}
    int_callers=$(awk -F, -v n="$name" 'NR>1 && $2==n {c++} END{print c+0}' "$GRAPH_CSV")
    shared_count=$(echo "$shared" | grep -c . || true)
    echo "${name},true,${sz},${lc},${inv},${int_callers},${shared_count}" >> "$OUT"
  else
    echo "${name},false,0,0,0,0,0" >> "$OUT"
  fi
done

# Re-walk graph.csv to count internal callers correctly (after the loop, the file is complete).
TMP_OUT="$OUT.tmp"
head -1 "$OUT" > "$TMP_OUT"
tail -n +2 "$OUT" | while IFS=, read -r n exists sz lc inv ic sc; do
  ic=$(awk -F, -v n="$n" 'NR>1 && $2==n {c++} END{print c+0}' "$GRAPH_CSV")
  echo "$n,$exists,$sz,$lc,$inv,$ic,$sc"
done >> "$TMP_OUT"
mv "$TMP_OUT" "$OUT"

# Human-readable graph
{
  echo "# Edge function call graph (caller -> callee)"
  echo "# Source: functions.invoke() and fetch('/functions/v1/<name>') inside supabase/functions/<caller>/."
  awk -F, 'NR>1 {print $1" -> "$2"  ["$3"]"}' "$GRAPH_CSV" | sort -u
} > "$GRAPH_TXT"

echo "Wrote:"
echo "  $OUT"
echo "  $INVOKE_OUT (+ multiline variant)"
echo "  $INVOKE_INDEX, $INVOKE_CSV"
echo "  $GRAPH_TXT, $GRAPH_CSV"
echo "  $SHARED_TXT"
echo "Total edge dirs: $(($(wc -l <"$OUT") - 1))"
echo "Total inter-edge edges: $(($(wc -l <"$GRAPH_CSV") - 1))"
