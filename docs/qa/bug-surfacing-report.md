# Bug Surfacing Report

Generated: 2026-04-18T19:04:11.292Z

## Run context

- **Playwright**: 34 tests, 1 passed, 0 failed, 33 skipped, 0 flaky (duration 35.4s).
  - ⚠️ 33 tests skipped — most likely missing QA_* credentials. See `docs/qa/how-to-run.md` for the env-var matrix.
- **Guest probe**: 17 routes walked headless against `http://localhost:5000`, 0 had console/page/HTTP errors.
- **k6 smoke**: 354 requests over 61s, p95 8.2 ms.
- **k6 load**: 11358 requests over 80s, p95 20.4 ms.
- **k6 stress**: 18060 requests over 80s, p95 449.4 ms.

## 1. Confirmed Bugs

_No failing Playwright tests recorded._

## 2. Weak Flows

| Route | Role | Symptom | Duration (ms) | Retries |
|---|---|---|---:|---:|
| `/` | guest | slow load | 8132 | 0 |

## 3. Performance Bottlenecks

| Stage | p50 (ms) | p95 (ms) | p99 (ms) | Error % | Status |
|---|---:|---:|---:|---:|---|
| smoke | 5.6 | 8.2 | 15.7 | 0.00 | within thresholds |
| load | 6.2 | 20.4 | 30.3 | 0.00 | within thresholds |
| stress | 230.4 | 449.4 | 486.2 | 0.00 | within thresholds |

## 4. Recommended Fixes (ranked by impact × reach ÷ effort)

| Rank | Score | Recommendation | Target area |
|---:|---:|---|---|
| 1 | 3 | Stabilize weak flow: / | `/` |
