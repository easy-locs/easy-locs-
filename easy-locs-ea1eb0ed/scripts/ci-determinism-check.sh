#!/bin/bash
set -uo pipefail

NUM_RUNS="${1:-5}"

echo "=== CI Determinism Check ==="
echo "Running test suite ${NUM_RUNS} times to verify zero flapping..."
echo ""

LOGS=()
EXITS=()

for i in $(seq 1 "$NUM_RUNS"); do
  LOG=$(mktemp)
  LOGS+=("$LOG")
  echo "--- Run $i of $NUM_RUNS ---"
  npx vitest run --reporter=json 2>/dev/null > "$LOG"
  EXIT_CODE=$?
  EXITS+=("$EXIT_CODE")

  if [ "$EXIT_CODE" -ne 0 ]; then
    echo "FAIL: Run $i exited with code $EXIT_CODE (tests failed)"
    for f in "${LOGS[@]}"; do rm -f "$f"; done
    exit 1
  fi
  echo "Run $i: passed (exit 0)"
done

echo ""
echo "--- Comparing per-test results across all runs ---"

extract_results() {
  node -e "
    const fs = require('fs');
    const raw = fs.readFileSync(process.argv[1], 'utf8');
    const data = JSON.parse(raw);
    const results = data.testResults
      .flatMap(f => f.assertionResults.map(t =>
        f.name.split('/').slice(-2).join('/') + ' :: ' + t.fullName + ' => ' + t.status
      ))
      .sort();
    results.forEach(r => console.log(r));
  " "$1"
}

BASELINE=$(extract_results "${LOGS[0]}")

for i in $(seq 1 $((NUM_RUNS - 1))); do
  CURRENT=$(extract_results "${LOGS[$i]}")
  DIFF=$(diff <(echo "$BASELINE") <(echo "$CURRENT") || true)

  if [ -n "$DIFF" ]; then
    echo ""
    echo "=== FAIL: Run $((i + 1)) differs from Run 1 (flapping detected) ==="
    echo "$DIFF"
    for f in "${LOGS[@]}"; do rm -f "$f"; done
    exit 1
  fi
done

TOTAL=$(echo "$BASELINE" | wc -l)
echo ""
echo "=== PASS: All $NUM_RUNS runs produced identical results ($TOTAL tests each) ==="

for f in "${LOGS[@]}"; do rm -f "$f"; done
