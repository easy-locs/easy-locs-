# Playwright Route Matrix Results

Results from `e2e/route-matrix.spec.ts` smoke tests.

## Public Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/` | — | — |
| `/login` | — | — |
| `/signup` | — | — |
| `/forgot-password` | — | — |
| `/landing` | — | — |
| `/radar` | — | — |
| `/browse` | — | — |
| `/install` | — | — |
| `/terms` | — | — |
| `/privacy` | — | — |
| `/about` | — | — |
| `/contact` | — | — |
| `/pay/link-resolver` | — | — |

## Protected Routes (expect redirect to /login)

| Route | Status | Redirected | Notes |
|-------|--------|-----------|-------|
| `/dashboard` | — | — | — |
| `/orbit` | — | — | — |
| `/wallet` | — | — | — |
| `/me` | — | — | — |

## Legend

- ✅ PASS — Route loaded correctly
- ❌ FAIL — Black screen, crash, or CF error
- ⚠️ DIAGNOSTIC — App rendered but env vars missing
- ➡️ REDIRECT — Protected route correctly redirected to /login

---

*Updated by CI after each run of `npx playwright test e2e/route-matrix.spec.ts`.*
