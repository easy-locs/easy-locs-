
-- Add type and title columns to conversations_v2
ALTER TABLE public.conversations_v2 ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'direct';
ALTER TABLE public.conversations_v2 ADD COLUMN IF NOT EXISTS title text;

-- Enable realtime for conversations_v2 if not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations_v2'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations_v2;
  END IF;
END $$;
