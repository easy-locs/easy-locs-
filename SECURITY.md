# Security

## Secret scanning

This repository is protected by a fast, dependency-free secret scanner at
`scripts/secret-scan.sh`. It greps tracked (and untracked-but-not-ignored)
files for high-confidence credential patterns — Stripe keys, AWS access
keys, GitHub tokens, Slack tokens, OpenAI / Anthropic / HuggingFace keys,
Mapbox tokens, private-key PEM blocks, database URLs with embedded
passwords, etc.

The scanner runs in two places:

1. **Locally, after every Replit merge** — invoked by
   `scripts/post-merge.sh`. A failure here surfaces loudly but does not
   block the (already-completed) merge.
2. **In GitHub Actions on every pull request and on pushes to `main`** —
   see `.github/workflows/secret-scan.yml`. The job fails (red check) if
   any credential pattern is matched, blocking the PR from being merged
   until the secret is removed and rotated.

### What to do if the check fails

1. Remove the credential from the file in question (and from git history
   if it has already been pushed — `git filter-repo` or BFG).
2. **Rotate the leaked credential immediately.** Assume any value the
   scanner flagged is compromised.
3. If the match is a false positive, narrow the offending pattern or add
   a path exclusion in `scripts/secret-scan.sh` (see the `SKIP_REGEX`
   block) and explain the exclusion in the commit message.

### Running the scanner locally

```bash
bash scripts/secret-scan.sh
```

It exits `0` on a clean scan and `1` if any credential pattern matches,
printing the offending file, line number, and matched text to stderr.
