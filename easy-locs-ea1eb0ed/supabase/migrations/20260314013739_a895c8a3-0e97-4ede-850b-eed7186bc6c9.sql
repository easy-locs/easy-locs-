
-- Add security level and transcript columns to messages table
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS security_level text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS anti_screenshot boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS anti_screen_record boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS self_destruct_on_forward boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS opened_by uuid,
  ADD COLUMN IF NOT EXISTS forwarded_at timestamptz,
  ADD COLUMN IF NOT EXISTS destroyed_at timestamptz,
  ADD COLUMN IF NOT EXISTS destroyed_reason text,
  ADD COLUMN IF NOT EXISTS security_policy_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS allow_copy boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_forward boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS transcript_text text,
  ADD COLUMN IF NOT EXISTS transcript_language text,
  ADD COLUMN IF NOT EXISTS transcript_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS transcript_error text,
  ADD COLUMN IF NOT EXISTS transcript_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS translated_transcript_text text,
  ADD COLUMN IF NOT EXISTS translated_transcript_language text,
  ADD COLUMN IF NOT EXISTS translation_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS translation_error text,
  ADD COLUMN IF NOT EXISTS translation_generated_at timestamptz;

-- Index for cleanup of expired + destroyed messages
CREATE INDEX IF NOT EXISTS idx_messages_security_level ON public.messages (security_level) WHERE security_level != 'normal';
CREATE INDEX IF NOT EXISTS idx_messages_transcript_status ON public.messages (transcript_status) WHERE transcript_status = 'pending';
