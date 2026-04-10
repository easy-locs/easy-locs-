
-- ═══ Production Payment Tables (Batch 1 — retry) ═══

-- 1. Transaction Intents
CREATE TABLE IF NOT EXISTS public.transaction_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AED',
  intent_type TEXT NOT NULL DEFAULT 'payment',
  status TEXT NOT NULL DEFAULT 'created',
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_intent_id TEXT,
  metadata_json JSONB DEFAULT '{}',
  context_type TEXT,
  context_id TEXT,
  error_message TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Topup Requests
CREATE TABLE IF NOT EXISTS public.topup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  wallet_id TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AED',
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_session_id TEXT,
  provider_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  method TEXT DEFAULT 'card',
  error_message TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Commission Splits
CREATE TABLE IF NOT EXISTS public.commission_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_intent_id UUID REFERENCES public.transaction_intents(id),
  order_id TEXT,
  total_amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AED',
  platform_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  platform_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  store_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  store_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  driver_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  driver_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  store_user_id UUID,
  driver_user_id UUID,
  status TEXT NOT NULL DEFAULT 'calculated',
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Payment Provider Events
CREATE TABLE IF NOT EXISTS public.payment_provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'stripe',
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}',
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, event_id)
);

-- 5. Settlement Records
CREATE TABLE IF NOT EXISTS public.settlement_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL,
  recipient_type TEXT NOT NULL DEFAULT 'store',
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AED',
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_payout_id TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  transaction_count INT NOT NULL DEFAULT 0,
  metadata_json JSONB DEFAULT '{}',
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Add user_id to existing payout_requests if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payout_requests' AND column_name='user_id') THEN
    ALTER TABLE public.payout_requests ADD COLUMN user_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payout_requests' AND column_name='approved_by') THEN
    ALTER TABLE public.payout_requests ADD COLUMN approved_by UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payout_requests' AND column_name='approved_at') THEN
    ALTER TABLE public.payout_requests ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payout_requests' AND column_name='rejected_reason') THEN
    ALTER TABLE public.payout_requests ADD COLUMN rejected_reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payout_requests' AND column_name='completed_at') THEN
    ALTER TABLE public.payout_requests ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payout_requests' AND column_name='provider') THEN
    ALTER TABLE public.payout_requests ADD COLUMN provider TEXT DEFAULT 'stripe';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payout_requests' AND column_name='provider_payout_id') THEN
    ALTER TABLE public.payout_requests ADD COLUMN provider_payout_id TEXT;
  END IF;
END $$;

-- 7. Payment Method Links
CREATE TABLE IF NOT EXISTS public.payment_method_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_method_id TEXT NOT NULL,
  method_type TEXT NOT NULL DEFAULT 'card',
  label TEXT,
  last4 TEXT,
  brand TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  expires_at TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider, provider_method_id)
);

-- 8. QR Payment Sessions
CREATE TABLE IF NOT EXISTS public.qr_payment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  creator_user_id UUID NOT NULL,
  amount NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'AED',
  context_type TEXT NOT NULL DEFAULT 'payment',
  context_id TEXT,
  store_id TEXT,
  terminal_id TEXT,
  table_number TEXT,
  order_id TEXT,
  nonce TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payer_user_id UUID,
  transaction_intent_id UUID REFERENCES public.transaction_intents(id),
  scanned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transaction_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_method_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_payment_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users read own transaction_intents" ON public.transaction_intents FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users read own topup_requests" ON public.topup_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users read own payout_requests" ON public.payout_requests FOR SELECT TO authenticated USING (owner_orbit_id = auth.uid()::text OR user_id = auth.uid());
CREATE POLICY "Users read own payment_method_links" ON public.payment_method_links FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users read own qr_sessions" ON public.qr_payment_sessions FOR SELECT TO authenticated USING (creator_user_id = auth.uid() OR payer_user_id = auth.uid());
CREATE POLICY "Users read own settlements" ON public.settlement_records FOR SELECT TO authenticated USING (recipient_user_id = auth.uid());
CREATE POLICY "Users read own commission_splits" ON public.commission_splits FOR SELECT TO authenticated USING (store_user_id = auth.uid() OR driver_user_id = auth.uid());

CREATE POLICY "Users insert own payment_methods" ON public.payment_method_links FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own payment_methods" ON public.payment_method_links FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users create qr_sessions" ON public.qr_payment_sessions FOR INSERT TO authenticated WITH CHECK (creator_user_id = auth.uid());
CREATE POLICY "Users create payout_requests" ON public.payout_requests FOR INSERT TO authenticated WITH CHECK (owner_orbit_id = auth.uid()::text OR user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transaction_intents_user ON public.transaction_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_intents_status ON public.transaction_intents(status);
CREATE INDEX IF NOT EXISTS idx_topup_requests_user ON public.topup_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_commission_splits_order ON public.commission_splits(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_provider_events_type ON public.payment_provider_events(event_type);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_token ON public.qr_payment_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_status ON public.qr_payment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_settlement_records_user ON public.settlement_records(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_user_new ON public.payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_method_links_user ON public.payment_method_links(user_id);
