-- Enable realtime for tables not yet in publication
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='commission_splits') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.commission_splits;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='delivery_jobs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_jobs;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='wallet_ledger_entries') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_ledger_entries;
  END IF;
END $$;