
-- ══════════════════════════════════════════════════════════
-- WAVE 1: Drop legacy 0-row tables with no code references
-- 27 tables — all verified: 0 rows, 0 code refs, no FK deps, no views
-- Triggers and RLS policies are dropped automatically with CASCADE
-- ══════════════════════════════════════════════════════════

-- ROLLBACK: These tables can be recreated from the types.ts schema definitions
-- if needed. All had 0 rows so no data loss.

-- ── Legacy Dispatch (4 tables) ──
DROP TABLE IF EXISTS public.dispatch_jobs CASCADE;
DROP TABLE IF EXISTS public.dispatch_jobs_v2 CASCADE;
DROP TABLE IF EXISTS public.dispatch_bids CASCADE;
DROP TABLE IF EXISTS public.dispatch_candidate_drivers CASCADE;
DROP TABLE IF EXISTS public.dispatch_prediction_jobs CASCADE;

-- ── Legacy Delivery (5 tables) ──
DROP TABLE IF EXISTS public.delivery_dispatch_attempts CASCADE;
DROP TABLE IF EXISTS public.delivery_eta_context CASCADE;
DROP TABLE IF EXISTS public.delivery_eta_predictions CASCADE;
DROP TABLE IF EXISTS public.delivery_fare_quotes CASCADE;
DROP TABLE IF EXISTS public.delivery_job_offers CASCADE;

-- ── Legacy Ride (5 tables) ──
DROP TABLE IF EXISTS public.ride_requests CASCADE;
DROP TABLE IF EXISTS public.ride_offers CASCADE;
DROP TABLE IF EXISTS public.ride_dispatch_logs CASCADE;
DROP TABLE IF EXISTS public.ride_eta_snapshots CASCADE;
DROP TABLE IF EXISTS public.taxi_ride_requests CASCADE;

-- ── Legacy Driver Location (2 tables) ──
DROP TABLE IF EXISTS public.driver_live_locations CASCADE;
DROP TABLE IF EXISTS public.drivers_live CASCADE;

-- ── Legacy Wallet / Payment (3 tables) ──
DROP TABLE IF EXISTS public.wallet_payment_intents CASCADE;
DROP TABLE IF EXISTS public.wallet_transfers CASCADE;
DROP TABLE IF EXISTS public.wallets_v2 CASCADE;

-- ── Legacy Notification (1 table) ──
DROP TABLE IF EXISTS public.push_device_tokens CASCADE;

-- ── Legacy Orbit / Call (4 tables) ──
DROP TABLE IF EXISTS public.call_auth_tokens CASCADE;
DROP TABLE IF EXISTS public.call_device_identities CASCADE;
DROP TABLE IF EXISTS public.call_security_events CASCADE;
DROP TABLE IF EXISTS public.call_sessions CASCADE;
DROP TABLE IF EXISTS public.orbit_call_presence CASCADE;
DROP TABLE IF EXISTS public.orbit_session_tokens CASCADE;
