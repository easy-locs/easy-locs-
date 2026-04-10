
-- Simple wallet + ledger tables for Stripe top-up flow
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'AED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own wallet" ON public.wallets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own wallet" ON public.wallets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role update wallets" ON public.wallets
  FOR UPDATE TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('credit', 'debit')),
  amount numeric NOT NULL,
  source text,
  status text DEFAULT 'completed',
  reference_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own ledger" ON public.wallet_ledger
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service insert ledger" ON public.wallet_ledger
  FOR INSERT TO authenticated WITH CHECK (true);

-- Auto-create wallet if missing, then update balance on ledger insert
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure wallet exists
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Update balance
  IF NEW.type = 'credit' THEN
    UPDATE public.wallets SET balance = balance + NEW.amount, updated_at = now() WHERE user_id = NEW.user_id;
  ELSIF NEW.type = 'debit' THEN
    UPDATE public.wallets SET balance = balance - NEW.amount, updated_at = now() WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS wallet_update_trigger ON public.wallet_ledger;
CREATE TRIGGER wallet_update_trigger
  AFTER INSERT ON public.wallet_ledger
  FOR EACH ROW EXECUTE FUNCTION public.update_wallet_balance();

-- Enable realtime for wallet balance updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
