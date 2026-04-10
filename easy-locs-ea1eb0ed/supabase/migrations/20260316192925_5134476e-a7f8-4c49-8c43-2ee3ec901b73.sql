
-- storefront_orders already in realtime, add carts only if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'storefront_carts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.storefront_carts;
  END IF;
END $$;
