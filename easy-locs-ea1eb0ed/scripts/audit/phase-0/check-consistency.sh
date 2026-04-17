#!/usr/bin/env bash
# Consistency gate. Asserts that every edge-function name and every
# table name embedded in a Phase-0 markdown report exists either on
# disk (for edge functions) or in the table provenance evidence (for
# tables). Exits non-zero on any mismatch.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
DOCS="$ROOT/docs/audit/phase-0"
EVID="$DOCS/99-evidence"

fail=0

# 1. Every name in edge-orphans-*.txt must resolve to supabase/functions/<name>/.
for f in "$EVID"/edge-orphans-*.txt; do
  [[ -s "$f" ]] || continue
  while IFS= read -r name; do
    [[ -z "$name" || "$name" == \#* ]] && continue
    if [[ ! -d "$ROOT/supabase/functions/$name" ]]; then
      echo "FAIL: $f references missing edge function: $name"
      fail=1
    fi
  done < "$f"
done

# 2. Every table mentioned in a report (`public.<name>` references) must
# exist in tables-create-provenance.txt.
PROV="$EVID/tables-create-provenance.txt"
[[ -s "$PROV" ]] || { echo "ERROR: $PROV missing"; exit 2; }
known_tables=$(awk -F: '{print $NF}' "$PROV" | sed 's/^public\.//' | LC_ALL=C sort -u)
for md in "$DOCS"/0[3-6]-*.md; do
  while read -r tbl; do
    [[ -z "$tbl" ]] && continue
    if ! grep -qx "$tbl" <<<"$known_tables"; then
      # Allow intentionally-absent canonical references documented in §6.4.
      case "$tbl" in
        # Documented as missing canonical tables in §6 of report 04.
        merchants|listings) continue ;;
        # Glob-pattern prose ("public.wallet_*", "public.system_*") not
        # real table names — discussed in 04 §schema-prefixing.
        wallet|system) continue ;;
      esac
      echo "FAIL: $md references unknown table public.$tbl"
      fail=1
    fi
  done < <(grep -oE "public\.[a-z][a-z0-9_]*[a-z0-9]" "$md" | sed 's/^public\.//' | LC_ALL=C sort -u)
done

# 3. Every evidence file referenced from a report must exist.
for md in "$DOCS"/*.md; do
  while read -r ref; do
    [[ -z "$ref" ]] && continue
    if [[ ! -e "$EVID/$ref" ]]; then
      echo "FAIL: $md references missing evidence file: 99-evidence/$ref"
      fail=1
    fi
  done < <(grep -oE "99-evidence/[A-Za-z0-9._/-]+\.(txt|csv)" "$md" | sed 's|99-evidence/||' | LC_ALL=C sort -u)
done

if [[ $fail -eq 0 ]]; then
  echo "OK: consistency gate passed."
else
  echo "FAILED: see lines above."
  exit 1
fi
