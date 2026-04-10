
-- Escrow payments table for delivery fee lifecycle
CREATE TABLE public.escrow_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.delivery_jobs(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  payer_id UUID NOT NULL,
  payee_id UUID,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending',
  held_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  release_reason TEXT,
  refund_reason TEXT,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_escrow_job_id ON public.escrow_payments(job_id);
CREATE INDEX idx_escrow_payer ON public.escrow_payments(payer_id);
CREATE INDEX idx_escrow_status ON public.escrow_payments(status);

-- RLS
ALTER TABLE public.escrow_payments ENABLE ROW LEVEL SECURITY;

-- Org members can view escrow for their org
CREATE POLICY "Org members can view escrow" ON public.escrow_payments
  FOR SELECT TO authenticated
  USING (public.get_org_role(auth.uid(), org_id) IS NOT NULL);

-- Payer can view their own escrow
CREATE POLICY "Payer can view own escrow" ON public.escrow_payments
  FOR SELECT TO authenticated
  USING (payer_id = auth.uid());

-- Payee can view their own escrow
CREATE POLICY "Payee can view own escrow" ON public.escrow_payments
  FOR SELECT TO authenticated
  USING (payee_id = auth.uid());

-- Only service role inserts/updates (via edge function)
-- No INSERT/UPDATE policies for authenticated users — all mutations go through the edge function
