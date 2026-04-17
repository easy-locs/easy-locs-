#!/usr/bin/env bash
# Auto-push helper: rewrites HEAD author to jstarbuzz@gmail.com if needed,
# then pushes the current branch to origin (GitHub easy-locs/easy-locs-).
# Triggered by .git/hooks/post-commit. Safe to run manually:
#   bash scripts/auto-push-github.sh
set -u

GIT_AUTHOR_NAME_TARGET="jstarbuzz"
GIT_AUTHOR_EMAIL_TARGET="jstarbuzz@gmail.com"
EXPECTED_ORIGIN_HOST_PATH="github.com/easy-locs/easy-locs-.git"
STATUS_FILE="/tmp/auto-push-github.status"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

write_status() {
  # $1 = ok|fail  $2 = message
  printf '%s\t%s\t%s\t%s\n' "$1" "$(date -u +%FT%TZ)" "$(git rev-parse HEAD 2>/dev/null || echo unknown)" "$2" > "${STATUS_FILE}" 2>/dev/null || true
}

if [ -z "${BRANCH}" ] || [ "${BRANCH}" = "HEAD" ]; then
  echo "[auto-push] detached HEAD, skipping push"
  write_status ok "detached HEAD, skipped"
  exit 0
fi

if [ -n "${AUTO_PUSH_SKIP:-}" ]; then
  echo "[auto-push] AUTO_PUSH_SKIP set, skipping"
  exit 0
fi

# Preflight: confirm origin URL points at the expected GitHub repo.
ORIGIN_URL="$(git config --get remote.origin.url 2>/dev/null || true)"
case "${ORIGIN_URL}" in
  *"${EXPECTED_ORIGIN_HOST_PATH}"*) : ;;
  *)
    msg="origin remote is '${ORIGIN_URL}', expected to contain '${EXPECTED_ORIGIN_HOST_PATH}' — refusing to push"
    echo "[auto-push] ${msg}"
    write_status fail "${msg}"
    # Exit 0 by design: never block the commit, but surface via status file.
    exit 0
    ;;
esac

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
  write_status ok "pushed ${BRANCH}"
  exit 0
else
  rc=$?
  msg="push FAILED (exit ${rc}) — run: bash scripts/auto-push-github.sh"
  echo "[auto-push] ${msg}"
  write_status fail "${msg}"
  # Never block the commit. post-merge.sh checks ${STATUS_FILE} and surfaces
  # failures loudly in the merge log.
  exit 0
fi
