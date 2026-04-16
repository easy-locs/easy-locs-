#!/usr/bin/env bash
set -euo pipefail

RESULTS_FILE="${1:-e2e-results.json}"
HISTORY_FILE="${2:-e2e-trends/history.json}"

if [ ! -f "$RESULTS_FILE" ]; then
  echo "Error: Results file '$RESULTS_FILE' not found."
  exit 1
fi

if [ ! -f "$HISTORY_FILE" ]; then
  echo "[]" > "$HISTORY_FILE"
fi

RUN_DATE="${E2E_RUN_DATE:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
COMMIT_SHA="${GITHUB_SHA:-$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')}"
BRANCH="${GITHUB_REF_NAME:-$(git branch --show-current 2>/dev/null || echo 'unknown')}"
TRIGGER="${E2E_TRIGGER:-manual}"

node -e "
const fs = require('fs');
const results = JSON.parse(fs.readFileSync('$RESULTS_FILE', 'utf8'));
const history = JSON.parse(fs.readFileSync('$HISTORY_FILE', 'utf8'));

const suites = results.suites || [];
const tests = [];

function collectTests(suite) {
  for (const spec of (suite.specs || [])) {
    for (const test of (spec.tests || [])) {
      const lastResult = test.results?.[test.results.length - 1];
      tests.push({
        file: suite.file || spec.file || '',
        title: spec.title,
        project: test.projectName || '',
        status: test.status,
        expectedStatus: test.expectedStatus,
        duration: lastResult?.duration || 0,
        retries: (test.results?.length || 1) - 1,
      });
    }
  }
  for (const child of (suite.suites || [])) {
    collectTests(child);
  }
}

for (const suite of suites) {
  collectTests(suite);
}

const passed = tests.filter(t => t.status === 'expected').length;
const failed = tests.filter(t => t.status === 'unexpected').length;
const flaky = tests.filter(t => t.status === 'flaky').length;
const skipped = tests.filter(t => t.status === 'skipped').length;
const totalDuration = tests.reduce((sum, t) => sum + t.duration, 0);

const flakyTests = tests
  .filter(t => t.status === 'flaky')
  .map(t => ({ file: t.file, title: t.title, project: t.project }));

const failedTests = tests
  .filter(t => t.status === 'unexpected')
  .map(t => ({ file: t.file, title: t.title, project: t.project }));

const entry = {
  date: '$RUN_DATE',
  commit: '$COMMIT_SHA',
  branch: '$BRANCH',
  trigger: '$TRIGGER',
  total: tests.length,
  passed,
  failed,
  flaky,
  skipped,
  durationMs: totalDuration,
  passRate: tests.length > 0 ? Math.round((passed / tests.length) * 10000) / 100 : 0,
  flakyTests,
  failedTests,
};

history.push(entry);

const MAX_ENTRIES = 90;
const trimmed = history.slice(-MAX_ENTRIES);

fs.writeFileSync('$HISTORY_FILE', JSON.stringify(trimmed, null, 2) + '\n');

console.log('--- E2E Trend Summary ---');
console.log('Date:     ' + entry.date);
console.log('Total:    ' + entry.total);
console.log('Passed:   ' + entry.passed);
console.log('Failed:   ' + entry.failed);
console.log('Flaky:    ' + entry.flaky);
console.log('Skipped:  ' + entry.skipped);
console.log('Pass Rate:' + entry.passRate + '%');
console.log('Duration: ' + (entry.durationMs / 1000).toFixed(1) + 's');
if (flakyTests.length > 0) {
  console.log('Flaky Tests:');
  flakyTests.forEach(t => console.log('  - ' + t.file + ' > ' + t.title + ' [' + t.project + ']'));
}
if (failedTests.length > 0) {
  console.log('Failed Tests:');
  failedTests.forEach(t => console.log('  - ' + t.file + ' > ' + t.title + ' [' + t.project + ']'));
}
"

echo "Trend data appended to $HISTORY_FILE"
