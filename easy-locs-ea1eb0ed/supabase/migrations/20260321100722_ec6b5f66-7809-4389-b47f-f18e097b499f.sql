-- Allow authenticated users to INSERT into seed_merchants and seed_products
CREATE POLICY "Authenticated users can insert seed merchants"
ON public.seed_merchants FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update seed merchants"
ON public.seed_merchants FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can insert seed products"
ON public.seed_products FOR INSERT TO authenticated
WITH CHECK (true);
