#!/usr/bin/env bash
# Installs tracked git hooks (scripts/git-hooks/*) into .git/hooks/ and
# (re)configures the canonical jstarbuzz <jstarbuzz@gmail.com> identity.
# Idempotent. Safe to run repeatedly.
set -u

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "${ROOT}" ]; then
  echo "[install-git-hooks] not inside a git repo, skipping"
  exit 0
fi

# Identity (global + local)
mkdir -p "${HOME}/.config/git" 2>/dev/null || true
git config --global user.email "jstarbuzz@gmail.com" 2>/dev/null || true
git config --global user.name  "jstarbuzz"           2>/dev/null || true
git config user.email "jstarbuzz@gmail.com"
git config user.name  "jstarbuzz"

SRC="${ROOT}/scripts/git-hooks"
DST="${ROOT}/.git/hooks"
mkdir -p "${DST}"

if [ -d "${SRC}" ]; then
  for hook in "${SRC}"/*; do
    [ -f "${hook}" ] || continue
    name="$(basename "${hook}")"
    cp -f "${hook}" "${DST}/${name}"
    chmod +x "${DST}/${name}"
    echo "[install-git-hooks] installed ${name}"
  done
fi

exit 0
