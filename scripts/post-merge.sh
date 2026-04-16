#!/bin/bash
set -e

# Run a fast secret scan on every merge to catch newly committed credentials.
# Failure here does NOT block the merge (already merged), but surfaces loudly
# in the post-merge log so the next agent/run can rotate immediately.
bash "$(dirname "$0")/secret-scan.sh" "$(dirname "$0")/.." || \
  echo "⚠️  secret-scan reported findings — review immediately and rotate any real credentials."

cd easy-locs-ea1eb0ed
npm install --no-fund --no-audit 2>&1 | tail -5
