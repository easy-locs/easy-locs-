#!/usr/bin/env bash
# Polling / interval / refetchInterval detection in src.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
OUT_DIR="$ROOT/docs/audit/phase-0/99-evidence"
mkdir -p "$OUT_DIR"

OUT="$OUT_DIR/polling-callsites.txt"
{
  echo "# setInterval / refetchInterval / revalidate / setTimeout-loop callsites"
  grep -RIn --include='*.ts' --include='*.tsx' \
    -E "(setInterval\(|refetchInterval\s*[:=]|refetchOnWindowFocus|revalidateOn|staleTime\s*:|cacheTime\s*:)" "$ROOT/src" \
    | sed -E "s|.*src/|src/|"
} > "$OUT"

# Realtime channels
{
  echo "# supabase channel/realtime subscriptions"
  grep -RIn --include='*.ts' --include='*.tsx' \
    -E "supabase\.channel\(|\.on\(\s*['\"]postgres_changes['\"]" "$ROOT/src" \
    | sed -E "s|.*src/|src/|"
} > "$OUT_DIR/realtime-callsites.txt"

echo "Wrote polling and realtime callsites"
