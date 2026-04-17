#!/usr/bin/env bash
# Read-only inventory of tables, columns, RLS policies, RPCs from migrations.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
OUT_DIR="$ROOT/docs/audit/phase-0/99-evidence"
mkdir -p "$OUT_DIR"
MIG="$ROOT/supabase/migrations"

# Tables created
{
  echo "# CREATE TABLE statements (table_name -> migration_file)"
  grep -RInh --include='*.sql' -iE "create\s+table\s+(if\s+not\s+exists\s+)?([a-z_\.]+\.)?[a-z0-9_]+" "$MIG" \
    | sed -E "s|.*create[[:space:]]+table[[:space:]]+(if[[:space:]]+not[[:space:]]+exists[[:space:]]+)?(public\.)?([a-zA-Z0-9_\.]+).*|\3|I" \
    | sort -u
} > "$OUT_DIR/tables-created.txt"

grep -RIl --include='*.sql' -iE "create\s+table" "$MIG" | sort -u > "$OUT_DIR/tables-create-migrations.txt"

# RLS policies
{
  echo "# CREATE POLICY statements (file:line:policy)"
  grep -RIn --include='*.sql' -iE "create\s+policy" "$MIG" \
    | sed -E "s|.*supabase/migrations/|supabase/migrations/|"
} > "$OUT_DIR/rls-policies.txt"

# RPC / functions
{
  echo "# CREATE FUNCTION / OR REPLACE FUNCTION (file:line:func)"
  grep -RIn --include='*.sql' -iE "create\s+(or\s+replace\s+)?function\s+" "$MIG" \
    | sed -E "s|.*supabase/migrations/|supabase/migrations/|"
} > "$OUT_DIR/rpc-functions.txt"

# Triggers
{
  echo "# CREATE TRIGGER (file:line)"
  grep -RIn --include='*.sql' -iE "create\s+(or\s+replace\s+)?trigger" "$MIG" \
    | sed -E "s|.*supabase/migrations/|supabase/migrations/|"
} > "$OUT_DIR/triggers.txt"

# Indexes
{
  echo "# CREATE INDEX (file:line)"
  grep -RIn --include='*.sql' -iE "create\s+(unique\s+)?index" "$MIG" \
    | sed -E "s|.*supabase/migrations/|supabase/migrations/|"
} > "$OUT_DIR/indexes.txt"

echo "Wrote tables/policies/rpc/triggers/indexes evidence files"
