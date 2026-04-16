#!/bin/bash
# Lightweight secret scanner run in the post-merge hook (and usable in CI).
# Greps tracked files (via `git ls-files`) for high-confidence credential
# patterns and fails (exit 1) if any are found. Designed to be fast and
# dependency-free.
#
# Usage: scripts/secret-scan.sh [path]
#   path defaults to the repository root.

set -u

ROOT="${1:-.}"
cd "$ROOT" || exit 2

# Patterns to flag. Each is an ERE matching a real-world token format.
# Generic words like "password" alone are NOT flagged here to avoid noise —
# the security audit doc tracks separate manual review items.
# Note on the PEM rule: we require the BEGIN marker to be followed by
# whitespace / newline escapes / quotes and then a sizeable base64 chunk,
# so that source code which only references the marker string (e.g.
# `.replace("-----BEGIN PRIVATE KEY-----", "")` for env-loaded keys) is not
# flagged. Hardcoded keys always have base64 body bytes after the marker.
PATTERNS='sbp_[A-Za-z0-9]{30,}|sk_live_[0-9a-zA-Z]{20,}|sk_test_[0-9a-zA-Z]{20,}|rk_live_[0-9a-zA-Z]{20,}|whsec_[A-Za-z0-9]{32,}|AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[0-9A-Za-z_]{60,}|glpat-[0-9A-Za-z_-]{20}|xox[baprs]-[A-Za-z0-9-]{20,}|AIza[0-9A-Za-z_-]{35}|sk-(proj-|ant-)?[A-Za-z0-9_-]{40,}|hf_[A-Za-z0-9]{30,}|sk\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|-----BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----[\\nrtsq"'"'"' ]*[A-Za-z0-9+/]{40,}|(postgres(ql)?|mysql|mongodb(\+srv)?|redis)://[^"'"'"' /]+:[^"'"'"' /@]+@'

# Path patterns to skip (vendored audit rules, this scanner, prior reports,
# build artifacts, lockfiles, large generated text artifacts at repo root).
SKIP_REGEX='^(\.config/|\.local/|node_modules/|.*/node_modules/|dist/|.*/dist/|storybook-static/|.*/storybook-static/|package-lock\.json$|.*/package-lock\.json$|.*\.lock$|easy-locs-ea1eb0ed/docs/security-audit-.*\.md$|easy-locs-ea1eb0ed/docs/credentials-scan-.*\.md$|scripts/secret-scan\.sh$|easy-locs-ea1eb0ed/scripts/security-scan\.ts$|all_.*\.txt$|.*_imports.*\.txt$|file_import_pairs\.txt$|orphan_.*\.txt$|candidates_.*\.txt$|missing_.*\.txt$|imported_.*\.txt$|registered_.*\.txt$|registry_.*\.txt$|component_files\.txt$|formatted_list\.txt$|attached_assets/.*)'

if ! command -v git >/dev/null 2>&1; then
  echo "secret-scan: git not available; skipping" >&2
  exit 0
fi

# List tracked files plus untracked-but-not-ignored files (so we also catch
# uncommitted leaks). Filter out the skip set.
mapfile -t FILES < <(
  { git ls-files; git ls-files --others --exclude-standard; } \
    | sort -u \
    | grep -Ev "$SKIP_REGEX" || true
)

if [ "${#FILES[@]}" -eq 0 ]; then
  echo "✅ Secret scan: no files to scan."
  exit 0
fi

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

# Use xargs to batch and -I to avoid arg-list overflow on large repos.
printf '%s\0' "${FILES[@]}" \
  | xargs -0 -P 4 -n 200 grep -EHnI -e "$PATTERNS" 2>/dev/null >"$tmp" || true

if [ -s "$tmp" ]; then
  echo "🚨 Potential leaked credentials detected:" >&2
  cat "$tmp" >&2
  echo >&2
  echo "If a match is a false positive, narrow the pattern or add an exclusion in scripts/secret-scan.sh." >&2
  exit 1
fi

echo "✅ Secret scan: no leaked credentials detected (${#FILES[@]} files scanned)."
