-- Fix: Add deny-all policy for internal_config (service role only table)
CREATE POLICY "No direct access" ON public.internal_config FOR ALL USING (false);

-- Create webhooks table for outgoing event notifications
CREATE TABLE public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  url text NOT NULL,
  secret text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  events text[] NOT NULL DEFAULT ARRAY['*'],
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_triggered_at timestamptz,
  failure_count int NOT NULL DEFAULT 0
);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org owners manage webhooks" ON public.webhooks
  FOR ALL TO authenticated
  USING (org_id IN (SELECT id FROM public.orgs WHERE owner_user_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT id FROM public.orgs WHERE owner_user_id = auth.uid()));

-- Webhook delivery log
CREATE TABLE public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid REFERENCES public.webhooks(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  response_status int,
  response_body text,
  delivered_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false
);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org owners view deliveries" ON public.webhook_deliveries
  FOR SELECT TO authenticated
  USING (webhook_id IN (
    SELECT w.id FROM public.webhooks w
    JOIN public.orgs o ON o.id = w.org_id
    WHERE o.owner_user_id = auth.uid()
  ));