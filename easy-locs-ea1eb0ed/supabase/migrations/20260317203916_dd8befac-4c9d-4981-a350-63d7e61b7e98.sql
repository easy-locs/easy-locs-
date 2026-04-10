
-- Shop follows table for Follow Shop CTA
CREATE TABLE public.shop_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, shop_id)
);

ALTER TABLE public.shop_follows ENABLE ROW LEVEL SECURITY;

-- Users can see their own follows
CREATE POLICY "Users can view own follows"
  ON public.shop_follows FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can follow shops
CREATE POLICY "Users can follow shops"
  ON public.shop_follows FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can unfollow shops
CREATE POLICY "Users can unfollow shops"
  ON public.shop_follows FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Shop owners can see their followers count (select)
CREATE POLICY "Shop owners can view followers"
  ON public.shop_follows FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.storefront_pages sp
      WHERE sp.id = shop_follows.shop_id AND sp.user_id = auth.uid()
    )
  );
