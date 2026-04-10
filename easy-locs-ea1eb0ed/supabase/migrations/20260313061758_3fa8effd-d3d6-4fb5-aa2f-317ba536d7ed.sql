
-- Metadata reduction: function to auto-purge old login events (keep 90 days)
CREATE OR REPLACE FUNCTION public.purge_old_login_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.login_events
  WHERE created_at < now() - interval '90 days';
END;
$$;

-- Metadata reduction: function to purge old expired sessions
CREATE OR REPLACE FUNCTION public.purge_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.user_sessions
  SET is_active = false
  WHERE last_active_at < now() - interval '30 days'
    AND is_active = true;
  
  DELETE FROM public.user_sessions
  WHERE is_active = false
    AND last_active_at < now() - interval '180 days';
END;
$$;

-- Add message_encrypted flag column to messages for indexing
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS encrypted boolean DEFAULT false;

-- Index for efficient encrypted message queries
CREATE INDEX IF NOT EXISTS idx_messages_encrypted ON public.messages (encrypted) WHERE encrypted = true;
