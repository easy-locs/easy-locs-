
-- rider_runtime_state already added to realtime in previous migration
-- just add the remaining table
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_runtime_state;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
