
-- Pass 10: Clean duplicate/stale policies

-- 1. current_ranking_state has duplicate INSERT and UPDATE policies
DROP POLICY IF EXISTS "Allow authenticated upsert current_ranking_state" ON public.current_ranking_state;
DROP POLICY IF EXISTS "Allow authenticated update current_ranking_state" ON public.current_ranking_state;

-- 2. loyalty_transactions has stale public role policy (authenticated one already exists from Pass 6)
DROP POLICY IF EXISTS "System insert loyalty" ON public.loyalty_transactions;

-- 3. stay_bookings has stale wide-open policy (scoped one exists from Pass 6)
DROP POLICY IF EXISTS "Authenticated users can book" ON public.stay_bookings;

-- 4. conversations_v2 - already fixed, just verify no duplicates
-- (no action needed)
