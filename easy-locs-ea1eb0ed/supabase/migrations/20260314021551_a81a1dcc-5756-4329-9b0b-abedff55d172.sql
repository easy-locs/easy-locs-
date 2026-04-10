-- Enable realtime for conversation_preferences
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_preferences;

-- Add unique constraint if not exists (needed for upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversation_preferences_user_id_context_id_key'
  ) THEN
    ALTER TABLE public.conversation_preferences ADD CONSTRAINT conversation_preferences_user_id_context_id_key UNIQUE (user_id, context_id);
  END IF;
END $$;