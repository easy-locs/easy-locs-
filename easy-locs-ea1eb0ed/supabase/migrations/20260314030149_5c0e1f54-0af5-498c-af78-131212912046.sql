
-- 1. FIX: Remove tenant direct access to orgs base table (use view instead)
DROP POLICY IF EXISTS "Tenants can read own org basic info" ON public.orgs;

-- 2. FIX: guest_sessions UPDATE - remove open USING condition
DROP POLICY IF EXISTS "Rate limit counter updates own session" ON public.guest_sessions;

-- 3. FIX: marketplace_reviews - restrict email visibility
DROP POLICY IF EXISTS "Published reviews for authenticated" ON public.marketplace_reviews;
CREATE POLICY "Published reviews for authenticated"
  ON public.marketplace_reviews FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    AND (
      reviewer_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.marketplace_providers mp
        JOIN public.org_members om ON om.org_id = mp.org_id
        WHERE mp.id = marketplace_reviews.provider_id AND om.user_id = auth.uid()
      )
    )
  );
