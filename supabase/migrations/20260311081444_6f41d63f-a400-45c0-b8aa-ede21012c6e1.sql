
CREATE TABLE public.marketplace_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID REFERENCES public.marketplace_providers(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.marketplace_services(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.marketplace_bookings(id) ON DELETE SET NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT,
  reviewer_user_id UUID,
  rating NUMERIC(2,1) NOT NULL DEFAULT 5.0,
  comment TEXT NOT NULL DEFAULT '',
  response TEXT,
  responded_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published reviews"
  ON public.marketplace_reviews FOR SELECT
  USING (status = 'published');

CREATE POLICY "Authenticated users can create reviews"
  ON public.marketplace_reviews FOR INSERT TO authenticated
  WITH CHECK (reviewer_user_id = auth.uid());

CREATE POLICY "Provider org members can update reviews"
  ON public.marketplace_reviews FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_providers mp
      JOIN public.org_members om ON om.org_id = mp.org_id
      WHERE mp.id = marketplace_reviews.provider_id AND om.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.update_provider_review_stats()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.marketplace_providers SET
    rating = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 1) FROM public.marketplace_reviews
      WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id) AND status = 'published'
    ), 0),
    reviews_count = COALESCE((
      SELECT COUNT(*)::integer FROM public.marketplace_reviews
      WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id) AND status = 'published'
    ), 0),
    updated_at = now()
  WHERE id = COALESCE(NEW.provider_id, OLD.provider_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_provider_review_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.marketplace_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_provider_review_stats();

-- Public RPC to fetch reviews for a provider
CREATE OR REPLACE FUNCTION public.get_provider_reviews(p_provider_id uuid, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
  RETURNS TABLE(id uuid, reviewer_name text, rating numeric, comment text, response text, service_title text, created_at timestamptz)
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT r.id, r.reviewer_name, r.rating, r.comment, r.response,
         ms.title AS service_title, r.created_at
  FROM public.marketplace_reviews r
  LEFT JOIN public.marketplace_services ms ON ms.id = r.service_id
  WHERE r.provider_id = p_provider_id AND r.status = 'published'
  ORDER BY r.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;
