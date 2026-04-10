
-- 1. Create conversation_threads table for proper thread architecture
CREATE TABLE public.conversation_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  initiator_id uuid NOT NULL,
  participant_ids uuid[] NOT NULL DEFAULT '{}',
  context_type text NOT NULL DEFAULT 'general',
  context_id text,
  listing_title text,
  listing_url text,
  provider_name text,
  status text NOT NULL DEFAULT 'active',
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Add thread_id to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS thread_id uuid REFERENCES public.conversation_threads(id) ON DELETE SET NULL;

-- 3. Contact reveal log table
CREATE TABLE public.contact_reveals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  org_id uuid,
  listing_id text,
  service_id text,
  reveal_type text NOT NULL DEFAULT 'phone',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Enable RLS on new tables
ALTER TABLE public.conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_reveals ENABLE ROW LEVEL SECURITY;

-- 5. RLS for conversation_threads
CREATE POLICY "Users can read own threads"
  ON public.conversation_threads FOR SELECT
  TO authenticated
  USING (initiator_id = auth.uid() OR auth.uid() = ANY(participant_ids) OR is_org_member(auth.uid(), org_id));

CREATE POLICY "Authenticated users can create threads"
  ON public.conversation_threads FOR INSERT
  TO authenticated
  WITH CHECK (initiator_id = auth.uid());

CREATE POLICY "Participants can update threads"
  ON public.conversation_threads FOR UPDATE
  TO authenticated
  USING (initiator_id = auth.uid() OR auth.uid() = ANY(participant_ids) OR is_org_member(auth.uid(), org_id));

-- 6. RLS for contact_reveals
CREATE POLICY "Users can insert own reveals"
  ON public.contact_reveals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own reveals"
  ON public.contact_reveals FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_org_member(auth.uid(), COALESCE(org_id, '00000000-0000-0000-0000-000000000000'::uuid)));

-- 7. Fix messages RLS: Allow any authenticated user to send inquiry messages (marketplace contact)
CREATE POLICY "Authenticated users can send inquiry messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND message_type = 'inquiry'
  );

-- 8. Allow authenticated users to read their own sent messages
CREATE POLICY "Users can read own sent messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid());

-- 9. Index for thread lookups
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_initiator ON public.conversation_threads(initiator_id);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_org ON public.conversation_threads(org_id);
CREATE INDEX IF NOT EXISTS idx_contact_reveals_user ON public.contact_reveals(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_reveals_created ON public.contact_reveals(created_at);
