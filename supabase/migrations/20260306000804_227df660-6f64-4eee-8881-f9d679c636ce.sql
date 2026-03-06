-- Remove user INSERT and UPDATE policies on subscriptions table
-- Only service role (edge functions) should write to this table
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;