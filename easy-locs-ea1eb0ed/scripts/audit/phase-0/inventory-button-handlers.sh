#!/usr/bin/env bash
# Find <Button …> components missing onClick / onPress / type="submit" / asChild / disabled handler.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
OUT_DIR="$ROOT/docs/audit/phase-0/99-evidence"
mkdir -p "$OUT_DIR"

# All <Button …> openings (single-line). We capture the opening tag start + attrs up to '>' on the same line.
TMP=$(mktemp)
grep -RIn --include='*.tsx' -E "<Button(\s|>)" "$ROOT/src" > "$TMP" || true

{
  echo "# <Button> usages with NO onClick / onPress / type=\"submit\" / asChild / formAction on the same line."
  echo "# Heuristic: a true unhandled button. Multi-line button props are reported in the second file."
  echo "# Format: file:line:tag"
  grep -E "<Button[^>]*>" "$TMP" \
    | grep -vE "onClick|onPress|asChild|type=[\"']submit[\"']|formAction|disabled" \
    | sed -E "s|.*src/|src/|" \
    | sort -u
} > "$OUT_DIR/buttons-without-handler-singleline.txt"

{
  echo "# <Button> openings whose tag spans multiple lines (heuristic candidates only)."
  echo "# Manual review required because the handler may be on a subsequent line."
  echo "# Format: file:line:opening"
  grep -E "<Button(\s+[^>]*$|\s*$)" "$TMP" \
    | sed -E "s|.*src/|src/|" \
    | sort -u
} > "$OUT_DIR/buttons-multiline-candidates.txt"

rm -f "$TMP"

SINGLE=$(grep -cv '^#' "$OUT_DIR/buttons-without-handler-singleline.txt" || true)
MULTI=$(grep -cv '^#' "$OUT_DIR/buttons-multiline-candidates.txt" || true)
echo "Single-line <Button> with no handler: $SINGLE"
echo "Multi-line <Button> opening tags (manual review): $MULTI"
