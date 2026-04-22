# Cloudflare Strict Config Report

Generated: 2026-04-22T03:09:47.460Z

## Results: 10 passed, 0 failed

- **[PASS]** _worker.js SPA fallback
  > Found /index.html fetch on 404
- **[PASS]** _headers CSP script-src has 'unsafe-inline'
  > script-src contains 'unsafe-inline'
- **[PASS]** _headers no COEP credentialless
  > COEP credentialless not present
- **[PASS]** _headers has worker-src 'self' blob:
  > worker-src directive present
- **[PASS]** wrangler.toml pages_build_output_dir = "dist"
  > Found pages_build_output_dir = "dist"
- **[PASS]** wrangler.toml name = "easy-locs"
  > Found name = "easy-locs"
- **[PASS]** package.json has build:cf script
  > build:cf = "cross-env SKIP_HEAVY_SEO=1 vite build"
- **[PASS]** build:cf contains SKIP_HEAVY_SEO
  > Found SKIP_HEAVY_SEO in build:cf
- **[PASS]** package.json no "wrangler versions upload"
  > "wrangler versions upload" not found
- **[PASS]** wrangler in devDependencies
  > wrangler: ^4.84.1

## Verdict: ✅ ALL CHECKS PASS
