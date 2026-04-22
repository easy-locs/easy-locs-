# Repair Backlog

Track known failures and their remediation status.

| Severity | Gate | File | Error | Root Cause | Patch Rec | Domain |
|----------|------|------|-------|------------|-----------|--------|
| <!-- BLOCKER/WARNING/INFO --> | <!-- gate name --> | <!-- file:line --> | <!-- error msg --> | <!-- root cause --> | <!-- patch recommendation --> | <!-- domain --> |

## Template Notes

- **Severity**: `BLOCKER` (prevents merge), `WARNING` (tracked), `INFO` (informational)
- **Gate**: Which CI gate failed (`typecheck`, `lint`, `cloudflare_strict`, etc.)
- **File**: Source file and line number where the issue occurs
- **Error**: The exact error message or failure description
- **Root Cause**: Why it's failing
- **Patch Rec**: Recommended fix
- **Domain**: Which product domain is affected (`auth`, `dashboard`, `radar`, etc.)

---

*This file is updated automatically by `scripts/generate-final-verdict.cjs` and `test-results/repair-backlog.json`.*
