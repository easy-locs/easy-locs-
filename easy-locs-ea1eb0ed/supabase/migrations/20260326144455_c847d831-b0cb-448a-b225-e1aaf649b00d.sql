-- Wave 3: Drop legacy tables with 0 rows, 0 code refs, 0 FK dependencies
-- Safe to drop after Wave 2 reroute completed

-- Notifications domain (rerouted to canonical 'notifications' table)
DROP TABLE IF EXISTS public.notifications_v2 CASCADE;
DROP TABLE IF EXISTS public.app_notifications CASCADE;

-- Radar/Zone domain (rerouted to 'geo_live_zone_overlays')
DROP TABLE IF EXISTS public.demand_zones CASCADE;

-- Wallet domain (rerouted to canonical wallet stack)
DROP TABLE IF EXISTS public.wallet_ledger CASCADE;

-- Mobility domain (already rerouted to 'mobility_jobs')
DROP TABLE IF EXISTS public.delivery_jobs CASCADE;

-- Orbit/Communication domain (0 rows, 0 FK deps)
DROP TABLE IF EXISTS public.group_messages CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;