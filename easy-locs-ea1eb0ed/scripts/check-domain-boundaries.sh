#!/usr/bin/env bash
set -euo pipefail

EXIT_CODE=0
NEW_VIOLATIONS=0

echo "=== Domain Boundary Enforcement Check ==="
echo ""

cd "$(dirname "$0")/.."

BASELINE_FILE="scripts/domain-boundary-baseline.txt"

is_baselined() {
  local file="$1"
  if [ -f "$BASELINE_FILE" ]; then
    grep -qF "$file" "$BASELINE_FILE" 2>/dev/null && return 0
  fi
  return 1
}

check_rule() {
  local rule_name="$1"
  local pattern="$2"
  shift 2
  local forbidden_dirs=("$@")

  for dir in "${forbidden_dirs[@]}"; do
    if [ -d "$dir" ]; then
      while IFS= read -r line; do
        [ -z "$line" ] && continue
        local file
        file=$(echo "$line" | cut -d: -f1)
        if is_baselined "$file"; then
          continue
        fi
        echo "NEW VIOLATION [$rule_name]: $line"
        NEW_VIOLATIONS=$((NEW_VIOLATIONS + 1))
        EXIT_CODE=1
      done < <(grep -rn "$pattern" "$dir" --include="*.ts" --include="*.tsx" 2>/dev/null || true)
    fi
  done
}

check_rule "NO_SUPABASE_IN_UI" \
  "from ['\"]@/integrations/supabase/client['\"]" \
  "src/components/" "src/pages/"

check_rule "NO_DIRECT_DB_SERVICE_IN_PAGES" \
  "from ['\"]@/services/db['\"]" \
  "src/components/" "src/pages/"

check_rule "NO_DIRECT_STORAGE_IN_UI" \
  "\.storage\s*\.\s*from\s*(" \
  "src/components/" "src/pages/"

echo "=== Edge Function Router-Origin Guard Check ==="
echo ""

FUNCTIONS_DIR="supabase/functions"
UNGUARDED=0

if [ -d "$FUNCTIONS_DIR" ]; then
  for fn_dir in "$FUNCTIONS_DIR"/*/; do
    fn_name=$(basename "$fn_dir")
    index_file="$fn_dir/index.ts"

    [[ "$fn_name" == _shared ]] && continue
    [[ "$fn_name" == *-router ]] && continue
    [[ "$fn_name" == public-api ]] && continue
    [[ "$fn_name" == stripe-webhook ]] && continue
    [[ "$fn_name" == ses-webhook ]] && continue
    [[ "$fn_name" == plaid-webhook ]] && continue
    [[ "$fn_name" == crypto-webhook ]] && continue
    [[ "$fn_name" == mobile-money-webhook ]] && continue
    [[ "$fn_name" == esign-webhook ]] && continue
    [[ "$fn_name" == dispatch-webhook ]] && continue
    [[ "$fn_name" == command-approval-webhook ]] && continue
    [[ "$fn_name" == command-email-intake ]] && continue
    [[ "$fn_name" == command-github-webhook ]] && continue
    [[ "$fn_name" == inngest-handler ]] && continue
    [[ "$fn_name" == autonomous-cron-dispatcher ]] && continue
    [[ "$fn_name" == prayer-push-cron ]] && continue
    [ ! -f "$index_file" ] && continue

    if ! grep -q "requireRouterOrigin" "$index_file" 2>/dev/null; then
      echo "UNGUARDED: $fn_name (missing requireRouterOrigin)"
      UNGUARDED=$((UNGUARDED + 1))
      EXIT_CODE=1
    fi
  done
fi

echo ""
echo "=== Summary ==="
echo "New domain boundary violations: $NEW_VIOLATIONS"
echo "Baselined violations: $(wc -l < "$BASELINE_FILE" 2>/dev/null || echo 0)"
echo "Unguarded edge functions: $UNGUARDED"

if [ $EXIT_CODE -eq 0 ]; then
  echo "All checks passed."
else
  echo "FAILED: Fix new violations above before merging."
fi

exit $EXIT_CODE
