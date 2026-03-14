
-- Add privacy/identity columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS privacy_read_receipts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS privacy_typing_indicators boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS display_name_mode text NOT NULL DEFAULT 'real',
  ADD COLUMN IF NOT EXISTS custom_display_name text,
  ADD COLUMN IF NOT EXISTS default_disappear_ttl text NOT NULL DEFAULT 'off';

-- Add disappear_at index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_messages_disappear_at 
  ON public.messages (disappear_at) 
  WHERE disappear_at IS NOT NULL;

-- Function to clean up expired ephemeral messages
CREATE OR REPLACE FUNCTION public.cleanup_expired_messages()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH expired AS (
    DELETE FROM public.messages 
    WHERE disappear_at IS NOT NULL 
      AND disappear_at::timestamptz < now()
    RETURNING id
  )
  SELECT count(*) INTO deleted_count FROM expired;
  RETURN deleted_count;
END;
$$;
