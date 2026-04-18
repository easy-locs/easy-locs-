#!/usr/bin/env bash
# Auto-push helper: keeps main in sync with origin and rewrites every
# Replit noreply commit (local OR pulled from origin) to jstarbuzz@gmail.com
# before pushing, so Vercel never blocks the deployment again.
#
# Triggered by .git/hooks/post-commit. Safe to run manually:
#   bash scripts/auto-push-github.sh
set -u

GIT_AUTHOR_NAME_TARGET="jstarbuzz"
GIT_AUTHOR_EMAIL_TARGET="jstarbuzz@gmail.com"
EXPECTED_ORIGIN_HOST_PATH="github.com/easy-locs/easy-locs-.git"
STATUS_FILE="/tmp/auto-push-github.status"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
MAX_ATTEMPTS=4
# How far back to scan + rewrite. The hook fires after every commit, so we
# only ever need to catch the 1-2 newest noreply commits. A tiny lookback
# keeps filter-branch under a second and prevents it from holding the git
# index lock long enough to stall the platform's merge pipeline.
REWRITE_LOOKBACK=5

write_status() {
  printf '%s\t%s\t%s\t%s\n' "$1" "$(date -u +%FT%TZ)" "$(git rev-parse HEAD 2>/dev/null || echo unknown)" "$2" > "${STATUS_FILE}" 2>/dev/null || true
}

write_status() {
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
    exit 0
    ;;
esac

# Ensure local identity is correct (idempotent)
git config user.email "${GIT_AUTHOR_EMAIL_TARGET}" >/dev/null
git config user.name  "${GIT_AUTHOR_NAME_TARGET}"  >/dev/null

has_noreply_in_range() {
  # $1 = git range
  while read -r _sha email; do
    case "${email}" in
      *@users.noreply.replit.com) return 0 ;;
    esac
  done < <(git log "$1" --pretty=format:'%H %ae' 2>/dev/null)
  return 1
}

rewrite_range() {
  # Rewrites every commit in $1 whose author/committer is a Replit noreply
  # to ${GIT_AUTHOR_EMAIL_TARGET}. Idempotent: a clean range is a no-op.
  local range="$1"
  if ! has_noreply_in_range "${range}"; then
    return 0
  fi
  echo "[auto-push] rewriting noreply authors in ${range} -> ${GIT_AUTHOR_EMAIL_TARGET}"
  export FILTER_BRANCH_SQUELCH_WARNING=1
  AUTO_PUSH_SKIP=1 git filter-branch -f --env-filter "
    case \"\$GIT_AUTHOR_EMAIL\" in *@users.noreply.replit.com)
      export GIT_AUTHOR_NAME='${GIT_AUTHOR_NAME_TARGET}'
      export GIT_AUTHOR_EMAIL='${GIT_AUTHOR_EMAIL_TARGET}' ;;
    esac
    case \"\$GIT_COMMITTER_EMAIL\" in *@users.noreply.replit.com)
      export GIT_COMMITTER_NAME='${GIT_AUTHOR_NAME_TARGET}'
      export GIT_COMMITTER_EMAIL='${GIT_AUTHOR_EMAIL_TARGET}' ;;
    esac
  " "${range}" >/dev/null 2>&1 || {
    echo "[auto-push] filter-branch failed on ${range}"
    return 1
  }
  return 0
}

attempt=0
while : ; do
  attempt=$((attempt + 1))

  git fetch origin "${BRANCH}" --quiet 2>/dev/null || true

  # If origin has commits we don't, merge them in (ours strategy keeps our
  # working state; we just need the history to fast-forward-able).
  if git rev-parse --verify --quiet "origin/${BRANCH}" >/dev/null; then
    if ! git merge-base --is-ancestor "origin/${BRANCH}" HEAD; then
      echo "[auto-push] origin/${BRANCH} has new commits, merging"
      AUTO_PUSH_SKIP=1 git merge "origin/${BRANCH}" --no-edit -X ours >/dev/null 2>&1 || {
        echo "[auto-push] merge failed, aborting attempt ${attempt}"
        AUTO_PUSH_SKIP=1 git merge --abort >/dev/null 2>&1 || true
      }
    fi
  fi

  # Rewrite the recent slice (covers any noreply commits we just pulled).
  rewrite_range "HEAD~${REWRITE_LOOKBACK}..HEAD" 2>/dev/null \
    || rewrite_range "HEAD" 2>/dev/null \
    || true

  echo "[auto-push] pushing ${BRANCH} -> origin (attempt ${attempt}/${MAX_ATTEMPTS})"
  if git push --force-with-lease origin "${BRANCH}" 2>/tmp/auto-push.err; then
    echo "[auto-push] push OK"
    write_status ok "pushed ${BRANCH}"
    exit 0
  fi

  err="$(cat /tmp/auto-push.err 2>/dev/null || echo '')"
  echo "[auto-push] push failed: ${err}"

  if [ "${attempt}" -ge "${MAX_ATTEMPTS}" ]; then
    msg="push FAILED after ${MAX_ATTEMPTS} attempts — run: bash scripts/auto-push-github.sh"
    echo "[auto-push] ${msg}"
    write_status fail "${msg}"
    # Never block the commit; post-merge.sh surfaces the status file.
    exit 0
  fi

  # Brief backoff before re-fetching origin and retrying.
  sleep 2
done
