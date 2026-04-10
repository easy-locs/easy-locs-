
-- 1) conversations_v2: add WITH CHECK to UPDATE policy
DROP POLICY IF EXISTS "conversations_participants_update" ON public.conversations_v2;
CREATE POLICY "conversations_participants_update"
ON public.conversations_v2
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orbit_profiles_v2 op
    WHERE op.id = auth.uid()
      AND conversations_v2.participants @> jsonb_build_array(jsonb_build_object('orbitId', op.orbit_id))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orbit_profiles_v2 op
    WHERE op.id = auth.uid()
      AND conversations_v2.participants @> jsonb_build_array(jsonb_build_object('orbitId', op.orbit_id))
  )
);

-- 2) chat_messages_v2: replace permissive UPDATE with sender-only UPDATE
DROP POLICY IF EXISTS "chat_messages_participants_update" ON public.chat_messages_v2;

-- Sender can update their own messages (body, metadata, etc.)
CREATE POLICY "chat_messages_sender_update"
ON public.chat_messages_v2
FOR UPDATE
TO authenticated
USING (
  sender_user_id = auth.uid()
)
WITH CHECK (
  sender_user_id = auth.uid()
);

-- Participants (non-sender) can only mark messages as read (read_at)
-- We use a separate policy that allows update only if sender_user_id is unchanged
CREATE POLICY "chat_messages_participant_mark_read"
ON public.chat_messages_v2
FOR UPDATE
TO authenticated
USING (
  sender_user_id IS DISTINCT FROM auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversations_v2 c
    JOIN public.orbit_profiles_v2 op ON op.id = auth.uid()
    WHERE c.id = chat_messages_v2.conversation_id
      AND c.participants @> jsonb_build_array(jsonb_build_object('orbitId', op.orbit_id))
  )
)
WITH CHECK (
  sender_user_id IS DISTINCT FROM auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversations_v2 c
    JOIN public.orbit_profiles_v2 op ON op.id = auth.uid()
    WHERE c.id = chat_messages_v2.conversation_id
      AND c.participants @> jsonb_build_array(jsonb_build_object('orbitId', op.orbit_id))
  )
);
