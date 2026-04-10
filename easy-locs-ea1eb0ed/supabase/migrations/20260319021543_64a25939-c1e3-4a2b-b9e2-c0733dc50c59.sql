
-- Wallet Hardening: RLS + constraints (skip wallet_pins constraint as it exists)

-- 1. Unique wallet per actor+currency
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_accounts_unique_owner
ON public.wallet_accounts (owner_type, owner_user_id, currency)
WHERE owner_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_accounts_unique_profile
ON public.wallet_accounts (owner_type, owner_profile_id, currency)
WHERE owner_profile_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_accounts_platform_singleton
ON public.wallet_accounts (owner_type, currency)
WHERE owner_type = 'platform';

-- 2. RLS for wallet_accounts
ALTER TABLE public.wallet_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own wallets" ON public.wallet_accounts;
CREATE POLICY "Users see own wallets" ON public.wallet_accounts
  FOR SELECT TO authenticated USING (owner_user_id = auth.uid());
DROP POLICY IF EXISTS "Users create own wallets" ON public.wallet_accounts;
CREATE POLICY "Users create own wallets" ON public.wallet_accounts
  FOR INSERT TO authenticated WITH CHECK (owner_user_id = auth.uid() OR owner_type = 'platform');

-- 3. RLS for wallet_pins — no client access (service_role only)
ALTER TABLE public.wallet_pins ENABLE ROW LEVEL SECURITY;

-- 4. RLS for wallet_transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own transactions" ON public.wallet_transactions;
CREATE POLICY "Users see own transactions" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 5. RLS for wallet_ledger_entries (read-only for clients)
ALTER TABLE public.wallet_ledger_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own ledger" ON public.wallet_ledger_entries;
CREATE POLICY "Users read own ledger" ON public.wallet_ledger_entries
  FOR SELECT TO authenticated
  USING (wallet_account_id IN (SELECT id FROM public.wallet_accounts WHERE owner_user_id = auth.uid()));

-- 6. RLS for wallet_order_splits
ALTER TABLE public.wallet_order_splits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own splits" ON public.wallet_order_splits;
CREATE POLICY "Users see own splits" ON public.wallet_order_splits
  FOR SELECT TO authenticated
  USING (wallet_account_id IN (SELECT id FROM public.wallet_accounts WHERE owner_user_id = auth.uid()));
DROP POLICY IF EXISTS "Insert splits for own orders" ON public.wallet_order_splits;
CREATE POLICY "Insert splits for own orders" ON public.wallet_order_splits
  FOR INSERT TO authenticated
  WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE customer_user_id = auth.uid()));

-- 7. RLS for payout_profiles
ALTER TABLE public.payout_profiles ENABLE ROW LEVEL SECURITY;

-- 8. RLS for pos_orders
ALTER TABLE public.pos_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "POS read access" ON public.pos_orders;
CREATE POLICY "POS read access" ON public.pos_orders FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "POS insert access" ON public.pos_orders;
CREATE POLICY "POS insert access" ON public.pos_orders FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "POS update access" ON public.pos_orders;
CREATE POLICY "POS update access" ON public.pos_orders FOR UPDATE TO authenticated USING (true);

-- 9. RLS for qr_order_targets
ALTER TABLE public.qr_order_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read QR targets" ON public.qr_order_targets;
CREATE POLICY "Public read QR targets" ON public.qr_order_targets FOR SELECT TO anon, authenticated USING (active = true);
DROP POLICY IF EXISTS "Manage QR targets" ON public.qr_order_targets;
CREATE POLICY "Manage QR targets" ON public.qr_order_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 10. Realtime for POS
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_orders;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
