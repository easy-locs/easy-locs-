CREATE TABLE IF NOT EXISTS public.scheduled_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_user_id uuid,
  contact_orbit_id text,
  contact_name text NOT NULL DEFAULT 'Contact',
  call_type text NOT NULL DEFAULT 'audio' CHECK (call_type IN ('audio', 'video')),
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'missed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_calls_user_id ON public.scheduled_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_status ON public.scheduled_calls(status, scheduled_at);

ALTER TABLE public.scheduled_calls ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scheduled_calls' AND policyname = 'scheduled_calls_user_crud') THEN
    CREATE POLICY scheduled_calls_user_crud ON public.scheduled_calls
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_calls;
