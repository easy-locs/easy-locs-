
-- Drop overly permissive policies
DROP POLICY IF EXISTS "System manages points" ON public.storefront_loyalty_points;
DROP POLICY IF EXISTS "System inserts history" ON public.storefront_loyalty_history;
DROP POLICY IF EXISTS "System manages alerts" ON public.storefront_inventory_alerts;
DROP POLICY IF EXISTS "System manages movements" ON public.storefront_stock_movements;

-- storefront_loyalty_points: owner of program can manage, user reads own (already exists)
CREATE POLICY "Program owner manages points" ON public.storefront_loyalty_points
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.storefront_loyalty_programs p
    WHERE p.id = storefront_loyalty_points.program_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.storefront_loyalty_programs p
    WHERE p.id = storefront_loyalty_points.program_id AND p.user_id = auth.uid()
  ));

-- storefront_loyalty_history: user reads own (already exists), program owner can read all
CREATE POLICY "Program owner reads history" ON public.storefront_loyalty_history
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.storefront_loyalty_programs p
    WHERE p.id = storefront_loyalty_history.program_id AND p.user_id = auth.uid()
  ));

-- storefront_inventory_alerts: shop owner manages (read already exists)
CREATE POLICY "Shop owner manages alerts" ON public.storefront_inventory_alerts
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.storefront_pages sp
    WHERE sp.id = storefront_inventory_alerts.shop_id AND sp.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.storefront_pages sp
    WHERE sp.id = storefront_inventory_alerts.shop_id AND sp.user_id = auth.uid()
  ));

-- storefront_stock_movements: shop owner manages (read already exists)
CREATE POLICY "Shop owner manages movements" ON public.storefront_stock_movements
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.storefront_pages sp
    WHERE sp.id = storefront_stock_movements.shop_id AND sp.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.storefront_pages sp
    WHERE sp.id = storefront_stock_movements.shop_id AND sp.user_id = auth.uid()
  ));
