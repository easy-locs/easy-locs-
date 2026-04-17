#!/usr/bin/env bash
# Routes ↔ pages reachability diff.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
OUT_DIR="$ROOT/docs/audit/phase-0/99-evidence"
mkdir -p "$OUT_DIR"

# 1. All <Route path="..."> declarations with file:line provenance.
{
  echo "# Route declarations with provenance (file:line:match)"
  grep -RIn --include='*.ts' --include='*.tsx' -E "<Route\s+[^>]*path=" "$ROOT/src" \
    | sed -E "s|.*src/|src/|"
} > "$OUT_DIR/routes-declared.txt"

# 2. All page files (truth list).
find "$ROOT/src/pages" -type f \( -name "*.ts" -o -name "*.tsx" \) \
  | sed -E "s|.*src/|src/|" | sort > "$OUT_DIR/page-files.txt.body"
{
  echo "# Page files (one per line, sorted)"
  cat "$OUT_DIR/page-files.txt.body"
} > "$OUT_DIR/page-files.txt"
rm -f "$OUT_DIR/page-files.txt.body"

# 3. ANY dynamic import("…pages/…") (covers lazy/safeLazy/withTimeout wrappers).
{
  echo "# dynamic import() callsites referencing pages/* (file:line:match)"
  grep -RIn --include='*.ts' --include='*.tsx' -E "import\(\s*[\"'\`][^\"'\`]*pages/" "$ROOT/src" \
    | sed -E "s|.*src/|src/|"
} > "$OUT_DIR/lazy-imports.txt"

# 4. All static imports of page modules (any pages/* in import statements anywhere in src/).
{
  echo "# Static import callsites referencing src/pages/* (file:line:import)"
  grep -RIn --include='*.ts' --include='*.tsx' -E "from\s+[\"'\`][^\"'\`]*pages/[A-Za-z0-9_/-]+[\"'\`]" "$ROOT/src" \
    | sed -E "s|.*src/|src/|"
} > "$OUT_DIR/page-imports.txt"

# 5. Imported page-module identifiers (deduplicated path tokens like 'pages/Foo' or 'pages/admin/Bar').
{
  echo "# Page modules referenced by dynamic or static import (de-duplicated)"
  {
    sed -nE "s|.*import\(\s*[\"'\`]([^\"'\`]+pages/[^\"'\`]+)[\"'\`].*|\1|p" "$OUT_DIR/lazy-imports.txt"
    sed -nE "s|.*from\s+[\"'\`]([^\"'\`]+pages/[^\"'\`]+)[\"'\`].*|\1|p" "$OUT_DIR/page-imports.txt"
  } | sed -E "s|^@/||; s|^\./+||; s|^\.\./+||" | sort -u
} > "$OUT_DIR/page-imports-deduped.txt"

# 6. Reachability diff: page files that are NOT referenced by any import in src/.
PAGE_LIST="$OUT_DIR/page-files.txt"
IMPORTED="$OUT_DIR/page-imports-deduped.txt"
{
  echo "# Page files with NO detected importer in src/ (candidate orphans)"
  echo "# Method: page file path stripped of extension, matched against imported tokens."
  grep -E "^src/pages/" "$PAGE_LIST" | while IFS= read -r p; do
    base="${p%.tsx}"
    base="${base%.ts}"
    # Token expected in imports (module specifiers don't include leading 'src/')
    tok="${base#src/}"
    if ! grep -qE "(^|/)$tok(\$|/)" "$IMPORTED" 2>/dev/null; then
      echo "$p"
    fi
  done
} > "$OUT_DIR/page-files-orphans.txt"

# 7. Route paths declared but with no page identifier resolvable in the same file
{
  echo "# Route paths declared (path=\"…\") with file:line"
  grep -RIn --include='*.ts' --include='*.tsx' -oE "<Route\s+[^>]*path=\"[^\"]+\"" "$ROOT/src" \
    | sed -E "s|.*src/|src/|"
} > "$OUT_DIR/routes-paths.txt"

echo "Wrote routes-declared.txt, page-files.txt, lazy-imports.txt,"
echo "      page-imports.txt, page-imports-deduped.txt,"
echo "      page-files-orphans.txt, routes-paths.txt"
echo "Page files: $(grep -c '^src/pages' "$PAGE_LIST")"
echo "Page-file orphans: $(grep -c '^src/pages' "$OUT_DIR/page-files-orphans.txt")"
