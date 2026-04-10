ALTER TABLE public.conversation_preferences 
  ADD COLUMN IF NOT EXISTS favorited boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cleared_at timestamptz DEFAULT NULL;