-- 1. Fix storefront_return_requests: scope seller policies to shop owner
DROP POLICY IF EXISTS "Seller can view shop returns rr" ON public.storefront_return_requests;
DROP POLICY IF EXISTS "Seller can update returns rr" ON public.storefront_return_requests;

CREATE POLICY "Shop owner can view returns" ON public.storefront_return_requests
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.storefront_pages sp
    WHERE sp.id = storefront_return_requests.shop_id AND sp.user_id = auth.uid()
  ));

CREATE POLICY "Shop owner can update returns" ON public.storefront_return_requests
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.storefront_pages sp
    WHERE sp.id = storefront_return_requests.shop_id AND sp.user_id = auth.uid()
  ));

-- 2. Fix storefront_vendors: replace public read with authenticated + scoped read
DROP POLICY IF EXISTS "vendors_read" ON public.storefront_vendors;

CREATE POLICY "Authenticated reads own or shop vendors" ON public.storefront_vendors
  FOR SELECT TO authenticated
  USING (
    vendor_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.storefront_pages sp
      WHERE sp.id = storefront_vendors.shop_id AND sp.user_id = auth.uid()
    )
  );