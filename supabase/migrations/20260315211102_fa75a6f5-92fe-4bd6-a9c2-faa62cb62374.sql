-- FIX 1: Remove dangerous INSERT/UPDATE policies on wallet_balances
DROP POLICY IF EXISTS "Users can insert own wallet balance" ON public.wallet_balances;
DROP POLICY IF EXISTS "Users can update own wallet balance" ON public.wallet_balances;

-- FIX 2: Remove dangerous INSERT policy on wallet_transactions
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.wallet_transactions;

-- FIX 3: Restrict ota_connections to admin role
DROP POLICY IF EXISTS "Org members can read ota_connections" ON public.ota_connections;
CREATE POLICY "Admins can read ota_connections" ON public.ota_connections FOR SELECT TO authenticated USING (public.has_min_role(auth.uid(), org_id, 'admin'));

DROP POLICY IF EXISTS "Org members can update ota" ON public.ota_connections;
CREATE POLICY "Admins can update ota_connections" ON public.ota_connections FOR UPDATE TO authenticated USING (public.has_min_role(auth.uid(), org_id, 'admin')) WITH CHECK (public.has_min_role(auth.uid(), org_id, 'admin'));

-- FIX 4: Set search_path on mutable functions
CREATE OR REPLACE FUNCTION public.update_updated_at() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;