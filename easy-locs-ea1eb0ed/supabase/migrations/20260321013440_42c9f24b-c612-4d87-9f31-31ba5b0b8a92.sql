
-- Enable realtime on storefront_orders if not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'storefront_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.storefront_orders;
  END IF;
END $$;
