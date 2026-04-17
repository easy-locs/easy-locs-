#!/usr/bin/env bash
# Build the orphan-RPC matrix:
#   - All RPC names defined in supabase/migrations/.
#   - All supabase.rpc("<name>") callsites in src/ and supabase/functions/.
#   - Diff: defined but never called (candidate orphans).
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
OUT_DIR="$ROOT/docs/audit/phase-0/99-evidence"
mkdir -p "$OUT_DIR"

NAMES="$OUT_DIR/rpc-names.txt"
if [[ ! -s "$NAMES" ]]; then
  echo "ERROR: $NAMES missing — run inventory-tables-policies.sh first." >&2
  exit 2
fi

# All callsites
{
  echo "# supabase.rpc(\"<name>\") callsites (path:line:match)"
  grep -RIn --include='*.ts' --include='*.tsx' \
    -E "supabase\.rpc\(\s*[\"'\`][a-zA-Z0-9_]+[\"'\`]" \
    "$ROOT/src" "$ROOT/supabase/functions" 2>/dev/null \
    | sed -E "s|.*easy-locs-ea1eb0ed/||"
} > "$OUT_DIR/rpc-callsites.txt"

# Per-name count
sed -nE "s|.*supabase\.rpc\(\s*[\"'\`]([a-zA-Z0-9_]+)[\"'\`].*|\1|p" "$OUT_DIR/rpc-callsites.txt" \
  | sort | uniq -c | sort -rn > "$OUT_DIR/rpc-callsite-counts.txt"

# Build per-name caller paths CSV
{
  echo "rpc_name,callsite_count,callers"
  while IFS= read -r name; do
    [[ -z "$name" ]] && continue
    callers=$(grep -E "supabase\.rpc\(\s*[\"'\`]${name}[\"'\`]" "$OUT_DIR/rpc-callsites.txt" \
      | awk -F: '{print $1":"$2}' | sort -u | paste -sd "|" -)
    cnt=$(awk -v n="$name" '$2==n {print $1; exit}' "$OUT_DIR/rpc-callsite-counts.txt")
    cnt=${cnt:-0}
    echo "$name,$cnt,\"${callers}\""
  done < "$NAMES"
} > "$OUT_DIR/rpc-orphan-matrix.csv"

# Defined-but-never-called candidates
{
  echo "# RPCs defined in migrations with ZERO callsite in src/ or supabase/functions/"
  awk -F, 'NR>1 && $2==0 {print $1}' "$OUT_DIR/rpc-orphan-matrix.csv" | LC_ALL=C sort
} > "$OUT_DIR/rpc-orphans.txt"

# Cross-check: RPCs invoked indirectly as trigger handlers (multi-line CREATE TRIGGER).
node "$ROOT/scripts/audit/phase-0/extract-trigger-targets.mjs" "$ROOT/supabase/migrations" \
  | LC_ALL=C sort -u > "$OUT_DIR/trigger-targets.txt"

# True orphans: defined RPCs neither called from code nor used as trigger handlers.
LC_ALL=C comm -23 \
  <(grep -v '^#' "$OUT_DIR/rpc-orphans.txt" | LC_ALL=C sort -u) \
  "$OUT_DIR/trigger-targets.txt" > "$OUT_DIR/rpc-true-orphans.txt"

DEFINED=$(wc -l <"$NAMES" | tr -d ' ')
ORPHANS=$(grep -cv '^#' "$OUT_DIR/rpc-orphans.txt" || true)
TRUE=$(wc -l <"$OUT_DIR/rpc-true-orphans.txt" | tr -d ' ')
echo "Defined RPCs: $DEFINED"
echo "RPCs with zero callsite: $ORPHANS"
echo "RPCs with zero callsite AND not used as trigger handler: $TRUE"
echo "Wrote rpc-callsites.txt, rpc-callsite-counts.txt, rpc-orphan-matrix.csv,"
echo "      rpc-orphans.txt, trigger-targets.txt, rpc-true-orphans.txt"
