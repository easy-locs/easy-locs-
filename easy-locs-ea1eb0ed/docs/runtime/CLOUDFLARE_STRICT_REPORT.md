# Cloudflare Strict Config Report

Generated: 2026-04-22T03:01:00.959Z

## Results: 5 passed, 3 failed

- **[PASS]** _worker.js SPA fallback
  > Found /index.html fetch on 404
- **[PASS]** _headers CSP script-src has 'unsafe-inline'
  > script-src contains 'unsafe-inline'
- **[PASS]** _headers no COEP credentialless
  > COEP credentialless not present
- **[PASS]** _headers has worker-src 'self' blob:
  > worker-src directive present
- **[FAIL]** wrangler.toml exists
  > wrangler.toml not found — skipping wrangler checks
- **[FAIL]** package.json has build:cf script
  > Missing build:cf script
- **[PASS]** package.json no "wrangler versions upload"
  > "wrangler versions upload" not found
- **[FAIL]** wrangler in devDependencies
  > wrangler not found in dependencies

## Verdict: ❌ 3 CHECK(S) FAILED
