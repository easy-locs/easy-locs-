#!/usr/bin/env bash
# Derive the four edge-function classification lists DIRECTLY from
# 99-evidence/edge-functions.csv, with on-disk verification. This is
# the canonical source for report 03 — never type a function name by
# hand.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
OUT_DIR="$ROOT/docs/audit/phase-0/99-evidence"
CSV="$OUT_DIR/edge-functions.csv"
[[ -s "$CSV" ]] || { echo "ERROR: $CSV missing — run inventory-edge-functions.sh first." >&2; exit 2; }

# Zero-caller set (no frontend invoker AND no internal caller).
awk -F, 'NR>1 && $2=="true" && $5==0 && $6==0 {print $1}' "$CSV" | LC_ALL=C sort -u > "$OUT_DIR/edge-orphans-zero-callers.txt"

# Routers (dispatched as <name> via op convention from clients).
grep -E -- "-router$" "$OUT_DIR/edge-orphans-zero-callers.txt" \
  > "$OUT_DIR/edge-orphans-routers.txt" || true

# Webhook / cron / dispatcher / cleanup / dlq names — alive via external triggers.
grep -Ev -- "-router$" "$OUT_DIR/edge-orphans-zero-callers.txt" \
  | grep -E -- "(-webhook$|-cron$|^cleanup-|^expire-|^csp-report$|dispatcher$|email-intake$|email-queue|^watchdog|^dlq-|^backup-|^collect-|^auto-source|^auto-onboarding)" \
  > "$OUT_DIR/edge-orphans-webhook-cron.txt" || true

# True orphan candidates = zero-callers minus routers minus webhook/cron.
grep -Ev -- "-router$|-webhook$|-cron$|^cleanup-|^expire-|^csp-report$|dispatcher$|email-intake$|email-queue|^watchdog|^dlq-|^backup-|^collect-|^auto-source|^auto-onboarding" \
  "$OUT_DIR/edge-orphans-zero-callers.txt" \
  > "$OUT_DIR/edge-orphans-true-candidates.txt" || true

# Verify every name in true-candidates resolves to an on-disk directory.
missing=0
while IFS= read -r name; do
  [[ -d "$ROOT/supabase/functions/$name" ]] || { echo "MISSING: $name"; missing=$((missing+1)); }
done < "$OUT_DIR/edge-orphans-true-candidates.txt"

echo "zero-callers: $(wc -l <"$OUT_DIR/edge-orphans-zero-callers.txt" | tr -d ' ')"
echo "routers: $(wc -l <"$OUT_DIR/edge-orphans-routers.txt" | tr -d ' ')"
echo "webhook/cron: $(wc -l <"$OUT_DIR/edge-orphans-webhook-cron.txt" | tr -d ' ')"
echo "true orphan candidates: $(wc -l <"$OUT_DIR/edge-orphans-true-candidates.txt" | tr -d ' ')"
echo "missing on disk (must be 0): $missing"
[[ "$missing" -eq 0 ]] || exit 3
