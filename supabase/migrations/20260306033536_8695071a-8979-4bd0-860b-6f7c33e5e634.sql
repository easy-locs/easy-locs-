
-- Reviews table for tenant reviews on landlords/properties
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reviewer_user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text DEFAULT '',
  landlord_reply text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews (public)
CREATE POLICY "Anyone can read reviews"
  ON public.reviews FOR SELECT
  USING (true);

-- Tenants can create their own reviews
CREATE POLICY "Tenants can create reviews"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tenants
      WHERE tenants.id = reviews.tenant_id
      AND tenants.tenant_user_id = auth.uid()
    )
  );

-- Tenants can update their own reviews
CREATE POLICY "Tenants can update own reviews"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (reviewer_user_id = auth.uid());

-- Landlords can update reviews in their org (for replies)
CREATE POLICY "Org members can reply to reviews"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (is_org_member(auth.uid(), org_id));

-- Org members can delete reviews
CREATE POLICY "Org members can delete reviews"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (is_org_member(auth.uid(), org_id));
