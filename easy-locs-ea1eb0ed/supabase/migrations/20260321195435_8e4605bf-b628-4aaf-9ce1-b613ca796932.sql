-- Allow users to insert/update their own wallet_balances_v2 row (for test top-up)
CREATE POLICY "balance_v2_insert_own" ON public.wallet_balances_v2
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "balance_v2_update_own" ON public.wallet_balances_v2
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);