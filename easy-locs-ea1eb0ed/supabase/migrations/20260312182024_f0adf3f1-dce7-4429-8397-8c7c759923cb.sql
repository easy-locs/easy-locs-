
-- Add voice message, archive, mute, block support columns
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS audio_url text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS audio_duration_seconds integer;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS forwarded_from uuid REFERENCES public.messages(id) ON DELETE SET NULL;

-- Thread-level controls: muted and archived per user
CREATE TABLE IF NOT EXISTS public.conversation_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  context_id text NOT NULL,
  muted boolean DEFAULT false,
  archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, context_id)
);

ALTER TABLE public.conversation_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own conversation prefs"
  ON public.conversation_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Blocked users table
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own blocks"
  ON public.blocked_users FOR ALL
  TO authenticated
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());

-- User reports table
CREATE TABLE IF NOT EXISTS public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_user_id uuid NOT NULL,
  reason text NOT NULL,
  context_id text,
  message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
  ON public.user_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can view own reports"
  ON public.user_reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());
