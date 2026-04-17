#!/usr/bin/env bash
# Writer-map: who INSERT/UPDATE/DELETE/UPSERT into which table.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
OUT_DIR="$ROOT/docs/audit/phase-0/99-evidence"
mkdir -p "$OUT_DIR"

# .from("table").insert/.update/.delete/.upsert across src + supabase/functions
{
  echo "# Supabase client mutations (file:line:.from(table).method)"
  grep -RIn --include='*.ts' --include='*.tsx' \
    -E "\.from\([\"'\`][a-z0-9_]+[\"'\`]\)\s*\.(insert|update|upsert|delete)\b" \
    "$ROOT/src" "$ROOT/supabase/functions" 2>/dev/null \
    | sed -E "s|.*easy-locs-ea1eb0ed/||"
} > "$OUT_DIR/mutations-callsites.txt"

# Edge functions only
{
  echo "# Edge function mutations (file:line:match)"
  grep -RIn \
    -E "\.from\([\"'\`][a-z0-9_]+[\"'\`]\)\s*\.(insert|update|upsert|delete)\b" \
    "$ROOT/supabase/functions" 2>/dev/null \
    | sed -E "s|.*supabase/functions/|supabase/functions/|"
} > "$OUT_DIR/edge-mutations.txt"

# Frontend mutations
{
  echo "# Frontend mutations under src/"
  grep -RIn --include='*.ts' --include='*.tsx' \
    -E "\.from\([\"'\`][a-z0-9_]+[\"'\`]\)\s*\.(insert|update|upsert|delete)\b" \
    "$ROOT/src" 2>/dev/null \
    | sed -E "s|.*src/|src/|"
} > "$OUT_DIR/frontend-mutations.txt"

# Per-table writer aggregation
{
  echo "# Writer count per table (table count_writes)"
  grep -RIhEo "\.from\([\"'\`][a-z0-9_]+[\"'\`]\)\s*\.(insert|update|upsert|delete)" \
    "$ROOT/src" "$ROOT/supabase/functions" 2>/dev/null \
    | sed -E "s|.from\([\"'\`]([a-z0-9_]+)[\"'\`]\)\.([a-z]+)|\1\t\2|" \
    | sort | uniq -c | sort -rn
} > "$OUT_DIR/writer-aggregation.txt"

echo "Wrote mutations and writer-aggregation"
