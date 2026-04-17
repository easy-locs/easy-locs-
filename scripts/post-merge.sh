#!/bin/bash
set -e

# Install git hooks + canonical identity so every commit auto-pushes to GitHub
# (Replit → GitHub → Vercel pipeline, see replit.md "Auto Pipeline").
bash "$(dirname "$0")/install-git-hooks.sh" || \
  echo "⚠️  install-git-hooks failed — auto-push to GitHub may not fire."

# Push the just-merged commit(s) to GitHub immediately so Vercel redeploys.
bash "$(dirname "$0")/auto-push-github.sh" || \
  echo "⚠️  auto-push-github failed — run manually: bash scripts/auto-push-github.sh"
# Surface push status loudly: auto-push-github.sh always exits 0 so it never
# blocks a commit, but it writes /tmp/auto-push-github.status — read it here.
if [ -f /tmp/auto-push-github.status ]; then
  PUSH_STATUS_LINE="$(cat /tmp/auto-push-github.status)"
  case "${PUSH_STATUS_LINE}" in
    ok*) echo "✅ auto-push: ${PUSH_STATUS_LINE}" ;;
    *)   echo "❌ auto-push FAILED — Vercel will NOT redeploy: ${PUSH_STATUS_LINE}" ;;
  esac
fi

# Run a fast secret scan on every merge to catch newly committed credentials.
# Failure here does NOT block the merge (already merged), but surfaces loudly
# in the post-merge log so the next agent/run can rotate immediately.
bash "$(dirname "$0")/secret-scan.sh" "$(dirname "$0")/.." || \
  echo "⚠️  secret-scan reported findings — review immediately and rotate any real credentials."

cd easy-locs-ea1eb0ed
npm install --no-fund --no-audit 2>&1 | tail -5
