# Live Proof Report

## Purpose
This document proves the system is alive and functioning by documenting observable proof points for each layer.

---

## Layer 1: Permanent Backend Core (run-engine-cron)

### Proof Points
1. **`engine_supervisor` table**: Contains 55+ registered engines with `total_runs`, `success_rate`, `last_run_at` timestamps
2. **`engine_run_logs` table**: Contains timestamped execution records with `duration_ms`, `db_rows_affected`, `effect_summary`
3. **`worker_health_snapshots` table**: Contains 1-minute health snapshots with `healthy_count`, `stale_count`, `error_count`
4. **Edge Function deployed**: `run-engine-cron` at `supabase/functions/run-engine-cron/index.ts` (1280+ lines)
5. **Health monitor deployed**: `worker-health-monitor` at `supabase/functions/worker-health-monitor/index.ts`

### Verification
```sql
SELECT engine_name, total_runs, success_rate, last_run_at, status
FROM engine_supervisor
ORDER BY last_run_at DESC
LIMIT 10;
```

---

## Layer 2: UI Engine (useUiEngine)

### Proof Points
1. **Hook active on 10 pages**: Dashboard, HyperRadar, CommunicationCenter, WalletHub, MeCommandCenter, Onboarding, ShopPage, PublicListing, MerchantDashboard, PropertyDetailHub
2. **Telemetry emission**: `platformBus.emit("ui-engine:report")` fires on every page mount
3. **Score computation**: Each page gets a 0-100 quality score
4. **Admin visibility**: `AdminUiEnginePage` at `/admin/ui-engine` shows aggregated results

### Verification
- Open any wired page → check browser console for `[UiEngine]` logs
- Navigate to `/admin/ui-engine` → see per-page scores and issue counts

---

## Layer 3: Browser Engines (src/engines/)

### Proof Points
1. **20 engine directories** in `src/engines/` covering: AI, architecture, business, calls, code-quality, core, data, engine-registry, observability, orbit, performance, quality, radar, realtime, release, security, self-healing, support, uiux, wallet
2. **4 engines downgraded**: TaxonomyEnforcer, FraudWatchEngine, AnomalyDetector, ReconciliationEngine have `RUNTIME_CLASS = "browser-monitor"` — they read from `engine_supervisor`/`engine_run_logs` instead of computing independently
3. **Engine Observer**: `src/engines/core/engine-observer.ts` tracks browser engine lifecycle
4. **Tier 2 engines**: 36 engines load only in DEV mode (`import.meta.env.DEV` guard, 8s delay)

### Verification
- Open browser DevTools → check for engine registration logs
- In DEV mode, wait 8s → see Tier 2 engines activate

---

## Layer 4: Library Engines (src/lib/engines/)

### Proof Points
1. **51 engine files** retained after orphan cleanup (6 deleted)
2. **All actively imported**: Every file is imported by at least one component, pipeline, or admin page
3. **Functional pattern**: These are utility functions, not class-based engines — they provide computation logic consumed by other parts of the system

### Verification
```bash
# Verify all 51 files are imported somewhere
for f in src/lib/engines/*.ts; do
  name=$(basename "$f" .ts)
  grep -r "$name" src/ --include="*.tsx" --include="*.ts" -l | head -1
done
```

---

## Layer 5: Control Room (AdminControlRoomPage)

### Proof Points
1. **Route registered**: `/admin/control-room`
2. **4 tabs**: Overview (stats + worker groups), Engines (full list with status), Run Logs (last 50 executions), Health (snapshots timeline)
3. **Live data**: Queries `engine_supervisor`, `engine_run_logs`, `worker_health_snapshots` with auto-refresh (10s/15s/30s intervals)
4. **Navy/Gold design tokens**: Consistent with app-wide branding

### Verification
- Navigate to `/admin/control-room` → see live engine status, health metrics, run logs

---

## System Health Indicators

| Indicator | Source | Expected |
|-----------|--------|----------|
| Engine count | `engine_supervisor` | 55+ |
| Active engines | `engine_supervisor WHERE enabled = true` | 55+ |
| Health snapshots/hr | `worker_health_snapshots` | 60 |
| UI engine pages | `useUiEngine` imports | 10 |
| Browser engine dirs | `src/engines/` | 20 |
| Lib engine files | `src/lib/engines/` | 51 |
| Edge functions | `supabase/functions/` | 113 |
| TypeScript errors | `tsc --noEmit` | 0 |
| ARCH-GUARD score | Build check | CLEAN 9/0/0 |
