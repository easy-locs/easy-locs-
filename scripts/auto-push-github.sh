#!/usr/bin/env bash
# Auto-push helper: rewrites HEAD author to jstarbuzz@gmail.com if needed,
# then pushes the current branch to origin (GitHub easy-locs/easy-locs-).
# Triggered by .git/hooks/post-commit. Safe to run manually:
#   bash scripts/auto-push-github.sh
set -u

GIT_AUTHOR_NAME_TARGET="jstarbuzz"
GIT_AUTHOR_EMAIL_TARGET="jstarbuzz@gmail.com"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

if [ -z "${BRANCH}" ] || [ "${BRANCH}" = "HEAD" ]; then
  echo "[auto-push] detached HEAD, skipping push"
  exit 0
fi

if [ -n "${AUTO_PUSH_SKIP:-}" ]; then
  echo "[auto-push] AUTO_PUSH_SKIP set, skipping"
  exit 0
fi

# Ensure local identity is correct (idempotent)
git config user.email "${GIT_AUTHOR_EMAIL_TARGET}" >/dev/null
git config user.name  "${GIT_AUTHOR_NAME_TARGET}"  >/dev/null

# Fetch to know what is unpushed
git fetch origin "${BRANCH}" --quiet 2>/dev/null || true

# Rewrite any unpushed commits whose author email is the Replit noreply form
RANGE="origin/${BRANCH}..HEAD"
if ! git rev-parse --verify --quiet "origin/${BRANCH}" >/dev/null; then
  RANGE="HEAD"
fi

NEEDS_REWRITE=0
while read -r sha email; do
  case "${email}" in
    *@users.noreply.replit.com)
      NEEDS_REWRITE=1
      break
      ;;
  esac
done < <(git log "${RANGE}" --pretty=format:'%H %ae' 2>/dev/null)

if [ "${NEEDS_REWRITE}" = "1" ]; then
  echo "[auto-push] rewriting unpushed commit authors -> ${GIT_AUTHOR_EMAIL_TARGET}"
  export FILTER_BRANCH_SQUELCH_WARNING=1
  AUTO_PUSH_SKIP=1 git filter-branch -f --env-filter "
    if [ \"\$GIT_AUTHOR_EMAIL\" = \"56905511-jstarbuzz@users.noreply.replit.com\" ] || \
       case \"\$GIT_AUTHOR_EMAIL\" in *@users.noreply.replit.com) true ;; *) false ;; esac; then
      export GIT_AUTHOR_NAME='${GIT_AUTHOR_NAME_TARGET}'
      export GIT_AUTHOR_EMAIL='${GIT_AUTHOR_EMAIL_TARGET}'
    fi
    if [ \"\$GIT_COMMITTER_EMAIL\" = \"56905511-jstarbuzz@users.noreply.replit.com\" ] || \
       case \"\$GIT_COMMITTER_EMAIL\" in *@users.noreply.replit.com) true ;; *) false ;; esac; then
      export GIT_COMMITTER_NAME='${GIT_AUTHOR_NAME_TARGET}'
      export GIT_COMMITTER_EMAIL='${GIT_AUTHOR_EMAIL_TARGET}'
    fi
  " "${RANGE}" >/dev/null 2>&1 || {
    echo "[auto-push] filter-branch failed, attempting push anyway"
  }
fi

echo "[auto-push] pushing ${BRANCH} -> origin"
if git push origin "${BRANCH}"; then
  echo "[auto-push] push OK"
  exit 0
else
  rc=$?
  echo "[auto-push] push FAILED (exit ${rc}). Run manually:"
  echo "  bash scripts/auto-push-github.sh"
  exit 0  # never block the commit
fi
