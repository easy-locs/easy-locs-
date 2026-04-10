
-- Enable realtime for messages table (INSERT already enabled, add UPDATE + DELETE)
-- This is idempotent - if already added, it will be a no-op
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
