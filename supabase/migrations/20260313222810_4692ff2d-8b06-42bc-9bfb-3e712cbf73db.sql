
-- Add soft-delete governance columns to messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deletion_reason text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_for_user_ids uuid[] DEFAULT NULL;

-- Index for filtering deleted messages efficiently
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON public.messages (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_deleted_for_user_ids ON public.messages USING GIN (deleted_for_user_ids) WHERE deleted_for_user_ids IS NOT NULL;

-- Audit trigger for message deletions
CREATE OR REPLACE FUNCTION public.audit_message_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    INSERT INTO public.audit_logs (user_id, org_id, action, metadata_json)
    VALUES (
      COALESCE(NEW.deleted_by, auth.uid()),
      NEW.org_id,
      'message_deleted',
      jsonb_build_object(
        'message_id', NEW.id,
        'deleted_for_all', COALESCE(NEW.deleted_for_all, false),
        'deleted_for_sender', COALESCE(NEW.deleted_for_sender, false),
        'deletion_reason', COALESCE(NEW.deletion_reason, 'user_action'),
        'deleted_by', COALESCE(NEW.deleted_by, auth.uid()),
        'had_attachment', OLD.attachment_url IS NOT NULL,
        'had_audio', OLD.audio_url IS NOT NULL,
        'original_content_length', length(OLD.content)
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_message_deletion ON public.messages;
CREATE TRIGGER trg_audit_message_deletion
  AFTER UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_message_deletion();
