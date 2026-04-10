
-- Storefront Wishlist
CREATE TABLE IF NOT EXISTS public.storefront_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, item_id)
);

ALTER TABLE public.storefront_wishlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own wishlist" ON public.storefront_wishlist
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
