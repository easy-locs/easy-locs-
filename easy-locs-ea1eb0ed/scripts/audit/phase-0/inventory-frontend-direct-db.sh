#!/usr/bin/env bash
# Frontend direct supabase access detection (violations of DDD adapter rule).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
OUT_DIR="$ROOT/docs/audit/phase-0/99-evidence"
mkdir -p "$OUT_DIR"

# All frontend supabase.from / .rpc / .storage.from / .auth callsites under src/
ALL="$OUT_DIR/frontend-supabase-callsites.txt"
{
  echo "# All supabase.* callsites under src/ (file:line:match)"
  grep -RIn --include='*.ts' --include='*.tsx' \
    -E "supabase\.(from|rpc|storage|auth|channel|removeChannel|functions)\b" "$ROOT/src" \
    | sed -E "s|.*src/|src/|"
} > "$ALL"

# Violations: anything outside the allowed surfaces
VIOL="$OUT_DIR/frontend-direct-db-violations.txt"
{
  echo "# Violations: supabase.(from|rpc|storage|auth) used OUTSIDE allowed surfaces"
  echo "# Allowed: src/integrations/supabase/, src/domains/*/adapters/, src/services/db*"
  grep -RIn --include='*.ts' --include='*.tsx' \
    -E "supabase\.(from|rpc|storage|auth)\b" "$ROOT/src" \
    | grep -vE "/src/integrations/supabase/" \
    | grep -vE "/src/domains/[^/]+/adapters/" \
    | grep -vE "/src/services/db" \
    | sed -E "s|.*src/|src/|"
} > "$VIOL"

# Counts by directory
{
  echo "# Violation counts by top-level src subdir"
  awk -F/ '{print $1"/"$2}' "$VIOL" | grep -v '^#' | sort | uniq -c | sort -rn
} > "$OUT_DIR/frontend-direct-db-violations-by-area.txt"

echo "Wrote $ALL and $VIOL"
echo "Total violations: $(grep -cv '^#' "$VIOL" || true)"
