-- Migration: Enable Supabase Realtime for Orbit V2 tables + ensure all columns exist
-- Date: 2026-04-11

-- ============================================================
-- 1. Enable Supabase Realtime for Orbit V2 tables
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages_v2'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages_v2;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations_v2'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations_v2;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_preferences'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_preferences;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'call_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;
  END IF;
END $$;

-- ============================================================
-- 2. Ensure all columns exist on chat_messages_v2
-- ============================================================

ALTER TABLE public.chat_messages_v2 ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.chat_messages_v2 ADD COLUMN IF NOT EXISTS deleted_for_sender boolean DEFAULT false;
ALTER TABLE public.chat_messages_v2 ADD COLUMN IF NOT EXISTS deleted_for_all boolean DEFAULT false;
ALTER TABLE public.chat_messages_v2 ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.chat_messages_v2 ADD COLUMN IF NOT EXISTS deletion_reason text;
ALTER TABLE public.chat_messages_v2 ADD COLUMN IF NOT EXISTS reply_to_message_id uuid;
ALTER TABLE public.chat_messages_v2 ADD COLUMN IF NOT EXISTS disappear_at timestamptz;
ALTER TABLE public.chat_messages_v2 ADD COLUMN IF NOT EXISTS view_once boolean DEFAULT false;
ALTER TABLE public.chat_messages_v2 ADD COLUMN IF NOT EXISTS view_once_opened_at timestamptz;
ALTER TABLE public.chat_messages_v2 ADD COLUMN IF NOT EXISTS view_once_opened_by uuid;
ALTER TABLE public.chat_messages_v2 ADD COLUMN IF NOT EXISTS starred boolean DEFAULT false;
ALTER TABLE public.chat_messages_v2 ADD COLUMN IF NOT EXISTS failed_at timestamptz;
ALTER TABLE public.chat_messages_v2 ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE public.chat_messages_v2 ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE public.chat_messages_v2 ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE public.chat_messages_v2 ADD COLUMN IF NOT EXISTS attachment_urls jsonb;
ALTER TABLE public.chat_messages_v2 ADD COLUMN IF NOT EXISTS audio_url text;
ALTER TABLE public.chat_messages_v2 ADD COLUMN IF NOT EXISTS audio_duration_seconds numeric;
ALTER TABLE public.chat_messages_v2 ADD COLUMN IF NOT EXISTS attachments jsonb;
ALTER TABLE public.chat_messages_v2 ADD COLUMN IF NOT EXISTS media_kind text;
ALTER TABLE public.chat_messages_v2 ADD COLUMN IF NOT EXISTS media_count integer DEFAULT 0;
ALTER TABLE public.chat_messages_v2 ADD COLUMN IF NOT EXISTS attachment_summary text;
ALTER TABLE public.chat_messages_v2 ADD COLUMN IF NOT EXISTS reactions jsonb;
ALTER TABLE public.chat_messages_v2 ADD COLUMN IF NOT EXISTS receiver_orbit_id text;
ALTER TABLE public.chat_messages_v2 ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- ============================================================
-- 3. Ensure all columns exist on conversations_v2
-- ============================================================

ALTER TABLE public.conversations_v2 ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.conversations_v2 ADD COLUMN IF NOT EXISTS last_message_preview text;
ALTER TABLE public.conversations_v2 ADD COLUMN IF NOT EXISTS created_by_orbit_id text;
ALTER TABLE public.conversations_v2 ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;
ALTER TABLE public.conversations_v2 ADD COLUMN IF NOT EXISTS muted boolean DEFAULT false;
ALTER TABLE public.conversations_v2 ADD COLUMN IF NOT EXISTS ghost_mode boolean DEFAULT false;
ALTER TABLE public.conversations_v2 ADD COLUMN IF NOT EXISTS unread_count_cache integer DEFAULT 0;

-- ============================================================
-- 4. Ensure conversation_preferences has all needed columns
-- ============================================================

ALTER TABLE public.conversation_preferences ADD COLUMN IF NOT EXISTS marked_unread boolean DEFAULT false;
ALTER TABLE public.conversation_preferences ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false;

-- ============================================================
-- 5. Indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_chat_messages_v2_deleted_at
  ON public.chat_messages_v2(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_v2_read_at
  ON public.chat_messages_v2(conversation_id, read_at) WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_v2_starred
  ON public.chat_messages_v2(starred) WHERE starred = true;

CREATE INDEX IF NOT EXISTS idx_chat_messages_v2_disappear
  ON public.chat_messages_v2(disappear_at) WHERE disappear_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_v2_last_message
  ON public.conversations_v2(last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_conversations_v2_metadata_direct
  ON public.conversations_v2 USING gin(metadata jsonb_path_ops);
