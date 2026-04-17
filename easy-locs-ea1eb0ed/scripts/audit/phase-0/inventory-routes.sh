#!/usr/bin/env bash
# Inventory of React routes vs page files.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
OUT_DIR="$ROOT/docs/audit/phase-0/99-evidence"
mkdir -p "$OUT_DIR"

# Route declarations: <Route path="..."  in src/routes and src/App.tsx
{
  echo "# Route path declarations (file:line:match)"
  grep -RIn --include='*.ts' --include='*.tsx' -E "<Route\s+path=" "$ROOT/src" \
    | sed -E "s|.*src/|src/|"
} > "$OUT_DIR/routes-declared.txt"

# Page files
{
  echo "# Page files under src/pages/"
  find "$ROOT/src/pages" -type f \( -name "*.ts" -o -name "*.tsx" \) | sed -E "s|.*src/|src/|" | sort
} > "$OUT_DIR/page-files.txt"

# Lazy imports
{
  echo "# lazy(() => import(...)) usages (file:line:match)"
  grep -RIn --include='*.ts' --include='*.tsx' -E "lazy\(\s*\(\s*\)\s*=>\s*import\(" "$ROOT/src" \
    | sed -E "s|.*src/|src/|"
} > "$OUT_DIR/lazy-imports.txt"

echo "Wrote routes-declared.txt, page-files.txt, lazy-imports.txt"
