#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PASS=0
FAIL=0

pass() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }

echo "═══ UI Quality Gate (STRICT) ═══"
echo ""

echo "▸ 1. TypeScript compilation"
if npx tsc --noEmit --skipLibCheck 2>/dev/null; then
  pass "TypeScript compiles clean"
else
  fail "TypeScript compilation errors"
fi

echo ""
echo "▸ 2. Design token coverage"
TOKEN_FILE="src/config/ui.ts"
for TOKEN in COLOR ACCENT LINE_HEIGHT DENSITY; do
  if grep -q "export const $TOKEN" "$TOKEN_FILE" 2>/dev/null; then
    pass "$TOKEN token exported"
  else
    fail "$TOKEN token missing from ui.ts"
  fi
done

echo ""
echo "▸ 3. Canonical component barrel"
BARREL="src/components/ui/design-system.ts"
if [ -f "$BARREL" ]; then
  EXPORT_COUNT=$(grep -c "export" "$BARREL" 2>/dev/null || echo 0)
  if [ "$EXPORT_COUNT" -ge 15 ]; then
    pass "design-system.ts barrel: ${EXPORT_COUNT} exports"
  else
    fail "design-system.ts barrel only has ${EXPORT_COUNT} exports (need 15+)"
  fi
else
  fail "design-system.ts barrel missing"
fi

echo ""
echo "▸ 4. Deprecated import guards (ESLint)"
ESLINT_CFG="eslint.config.js"
for PATTERN in AppPageShell UniversePageShell SEOPageShell; do
  if grep -q "$PATTERN" "$ESLINT_CFG" 2>/dev/null; then
    pass "ESLint guards $PATTERN"
  else
    fail "ESLint missing guard for $PATTERN"
  fi
done

echo ""
echo "▸ 5. Hardcoded hex colors in pillar pages"
HEX_HITS=$(grep -rn '#[0-9a-fA-F]\{3,8\}' src/pages/Dashboard.tsx src/pages/WalletHubPage.tsx src/pages/MeCommandCenter.tsx src/pages/HyperRadarPage.tsx src/pages/OrbitContactsPageV2.tsx src/components/layout/AdaptiveLayout.tsx 2>/dev/null | grep -v '//' | grep -v 'hsl' | wc -l)
if [ "$HEX_HITS" -le 2 ]; then
  pass "Pillar pages: ${HEX_HITS} raw hex colors (≤2 allowed)"
else
  fail "Pillar pages: ${HEX_HITS} raw hex colors (max 2)"
fi

echo ""
echo "▸ 6. UI engine coverage"
UI_ENGINE_PAGES=$(grep -rl 'useUiEngine' src/pages/ 2>/dev/null | wc -l)
if [ "$UI_ENGINE_PAGES" -ge 10 ]; then
  pass "useUiEngine active on ${UI_ENGINE_PAGES} pages (≥10)"
else
  fail "useUiEngine only on ${UI_ENGINE_PAGES} pages (need 10+)"
fi

echo ""
echo "▸ 7. Anti-regression ESLint rules"
if grep -q '"no-restricted-syntax"' "$ESLINT_CFG" 2>/dev/null; then
  RULE_COUNT=$(grep -c 'selector:' "$ESLINT_CFG" 2>/dev/null || echo 0)
  if [ "$RULE_COUNT" -ge 3 ]; then
    pass "ESLint no-restricted-syntax: ${RULE_COUNT} selectors (≥3)"
  else
    fail "ESLint no-restricted-syntax: only ${RULE_COUNT} selectors (need 3+)"
  fi
else
  fail "No ESLint no-restricted-syntax rules found"
fi

SEVERITY=$(grep -A1 '"no-restricted-syntax"' "$ESLINT_CFG" 2>/dev/null | grep -o '"error"\|"warn"' | head -1)
if [ "$SEVERITY" = '"error"' ]; then
  pass "ESLint no-restricted-syntax severity: error (blocking)"
else
  fail "ESLint no-restricted-syntax severity is not error (currently: $SEVERITY)"
fi

echo ""
echo "▸ 8. UI engine detectors"
DETECTOR_FILE="src/lib/ui-engine/detectors.ts"
for FN in findHardcodedColors findMissingCardAttributes findNonResponsiveWidths; do
  if grep -q "export function $FN" "$DETECTOR_FILE" 2>/dev/null; then
    pass "Detector: $FN"
  else
    fail "Missing detector: $FN"
  fi
done

echo ""
echo "═══════════════════════════════"
echo "Results: ${PASS} pass, ${FAIL} fail"
if [ "$FAIL" -gt 0 ]; then
  echo "QUALITY GATE: FAILED"
  exit 1
else
  echo "QUALITY GATE: PASSED"
  exit 0
fi
