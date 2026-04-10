
-- WAVE 10: Fix remaining 3 custom scan errors

-- 1. marketplace_reviews — strip reviewer_email from auth reads
-- Create a safe view for published reviews without email
CREATE OR REPLACE FUNCTION public.get_published_reviews(p_service_id uuid DEFAULT NULL, p_provider_id uuid DEFAULT NULL, p_limit int DEFAULT 50)
RETURNS TABLE(
  id uuid, service_id uuid, provider_id uuid, reviewer_user_id uuid,
  reviewer_name text, rating numeric, comment text, status text,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, service_id, provider_id, reviewer_user_id,
         reviewer_name, rating, comment, status,
         created_at, updated_at
  FROM public.marketplace_reviews
  WHERE status = 'published'
    AND (p_service_id IS NULL OR service_id = p_service_id)
    AND (p_provider_id IS NULL OR provider_id = p_provider_id)
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

-- Restrict direct table access to owner/admin only
DROP POLICY IF EXISTS "reviews_auth_published" ON public.marketplace_reviews;
CREATE POLICY "reviews_own_or_admin" ON public.marketplace_reviews
FOR SELECT TO authenticated USING (
  reviewer_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- 2. auto_discovered_merchants — restrict auth policy to admin only
DROP POLICY IF EXISTS "auth_read_discovered_merchants" ON public.auto_discovered_merchants;
CREATE POLICY "admin_read_discovered_merchants" ON public.auto_discovered_merchants
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
);
