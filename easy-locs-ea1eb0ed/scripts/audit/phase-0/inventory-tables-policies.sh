#!/usr/bin/env bash
# Read-only inventory of tables/columns/RLS/RPC reconstructed from
# supabase/migrations/. Every record carries file:line provenance.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
OUT_DIR="$ROOT/docs/audit/phase-0/99-evidence"
mkdir -p "$OUT_DIR"
MIG="$ROOT/supabase/migrations"

# ── 1. CREATE TABLE provenance (file:line:table_name). ──
{
  echo "# CREATE TABLE provenance (relative_path:line:table_name)"
  grep -RIn --include='*.sql' -iE "^\s*create\s+table\s+(if\s+not\s+exists\s+)?[a-z0-9_\.\"]+" "$MIG" \
    | sed -E "s|.*supabase/migrations/|supabase/migrations/|" \
    | sed -E "s|^([^:]+:[0-9]+):.*create[[:space:]]+table[[:space:]]+(if[[:space:]]+not[[:space:]]+exists[[:space:]]+)?(\"?[a-zA-Z0-9_\.]+\"?).*|\1:\3|I" \
    | sort -u
} > "$OUT_DIR/tables-create-provenance.txt"

# Distinct table names (from provenance, last colon field).
awk -F: 'NR>1 {print $NF}' "$OUT_DIR/tables-create-provenance.txt" \
  | sed -E 's/^"|"$//g' \
  | sed -E 's/^public\.//' \
  | sort -u > "$OUT_DIR/tables-created.txt"

# ── 2. Per-table column extraction. ──
# Walk each migration and extract column lines inside CREATE TABLE blocks
# until the matching ");". Output: file:line:table:column:type
node "$ROOT/scripts/audit/phase-0/extract-columns.mjs" "$MIG" "$OUT_DIR/tables-columns.csv"

# ── 3. RLS policies with provenance. ──
{
  echo "# CREATE POLICY (relative_path:line:full_match)"
  grep -RIn --include='*.sql' -iE "create\s+policy" "$MIG" \
    | sed -E "s|.*supabase/migrations/|supabase/migrations/|"
} > "$OUT_DIR/rls-policies.txt"

# ── 4. Functions / RPCs (with name extracted). ──
{
  echo "# CREATE FUNCTION provenance (relative_path:line:function_name)"
  grep -RIn --include='*.sql' -iE "create\s+(or\s+replace\s+)?function\s+(public\.)?[a-z0-9_]+\s*\(" "$MIG" \
    | sed -E "s|.*supabase/migrations/|supabase/migrations/|" \
    | sed -E "s|^([^:]+:[0-9]+):.*create[[:space:]]+(or[[:space:]]+replace[[:space:]]+)?function[[:space:]]+(public\.)?([a-zA-Z0-9_]+)\s*\(.*|\1:\4|I"
} > "$OUT_DIR/rpc-functions-provenance.txt"

# Unique RPC names
awk -F: 'NR>1 {print $NF}' "$OUT_DIR/rpc-functions-provenance.txt" | sort -u > "$OUT_DIR/rpc-names.txt"

# ── 5. Triggers / Indexes provenance. ──
{
  echo "# CREATE TRIGGER (relative_path:line:full_match)"
  grep -RIn --include='*.sql' -iE "create\s+(or\s+replace\s+)?trigger" "$MIG" \
    | sed -E "s|.*supabase/migrations/|supabase/migrations/|"
} > "$OUT_DIR/triggers.txt"

{
  echo "# CREATE INDEX (relative_path:line:full_match)"
  grep -RIn --include='*.sql' -iE "create\s+(unique\s+)?index" "$MIG" \
    | sed -E "s|.*supabase/migrations/|supabase/migrations/|"
} > "$OUT_DIR/indexes.txt"

echo "Wrote tables-create-provenance.txt, tables-created.txt, tables-columns.csv,"
echo "      rls-policies.txt, rpc-functions-provenance.txt, rpc-names.txt,"
echo "      triggers.txt, indexes.txt"
