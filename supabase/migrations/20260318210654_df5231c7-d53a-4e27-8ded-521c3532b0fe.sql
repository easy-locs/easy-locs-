
-- Guest support for carts
ALTER TABLE public.storefront_carts ADD COLUMN IF NOT EXISTS guest_id text;

-- Delivery proof system
CREATE TABLE IF NOT EXISTS public.delivery_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  dispatch_job_id uuid REFERENCES public.dispatch_jobs(id) ON DELETE SET NULL,
  driver_user_id uuid,
  proof_type text DEFAULT 'photo',
  photo_url text,
  signature_data text,
  geo_lat numeric,
  geo_lng numeric,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.delivery_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_proofs_select_relevant"
ON public.delivery_proofs FOR SELECT TO authenticated
USING (
  driver_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = delivery_proofs.order_id
    AND (o.customer_user_id = auth.uid() OR (o.workspace_id IS NOT NULL AND public.is_workspace_member(o.workspace_id)))
  )
);

CREATE POLICY "delivery_proofs_insert_driver"
ON public.delivery_proofs FOR INSERT TO authenticated
WITH CHECK (driver_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_delivery_proofs_order ON public.delivery_proofs(order_id);
