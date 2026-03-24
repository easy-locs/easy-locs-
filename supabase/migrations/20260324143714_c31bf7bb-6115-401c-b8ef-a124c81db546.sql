-- Fix RLS on conversations_v2: support both old (raw UUID array) and new (object array with orbitId) formats
DROP POLICY IF EXISTS "conversations_participants_read" ON public.conversations_v2;
DROP POLICY IF EXISTS "conversations_creator_insert" ON public.conversations_v2;
DROP POLICY IF EXISTS "conversations_participants_update" ON public.conversations_v2;

CREATE POLICY "conversations_participants_read" ON public.conversations_v2
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orbit_profiles_v2 op
    WHERE op.id = auth.uid()
    AND (
      conversations_v2.participants @> jsonb_build_array(jsonb_build_object('orbitId', op.orbit_id))
      OR conversations_v2.participants @> to_jsonb(ARRAY[op.id::text])
      OR conversations_v2.participants @> to_jsonb(ARRAY[op.orbit_id])
    )
  )
);

CREATE POLICY "conversations_creator_insert" ON public.conversations_v2
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "conversations_participants_update" ON public.conversations_v2
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orbit_profiles_v2 op
    WHERE op.id = auth.uid()
    AND (
      conversations_v2.participants @> jsonb_build_array(jsonb_build_object('orbitId', op.orbit_id))
      OR conversations_v2.participants @> to_jsonb(ARRAY[op.id::text])
      OR conversations_v2.participants @> to_jsonb(ARRAY[op.orbit_id])
    )
  )
);

DROP POLICY IF EXISTS "chat_messages_participants_read" ON public.chat_messages_v2;
DROP POLICY IF EXISTS "chat_messages_sender_insert" ON public.chat_messages_v2;
DROP POLICY IF EXISTS "chat_messages_participants_update" ON public.chat_messages_v2;

CREATE POLICY "chat_messages_participants_read" ON public.chat_messages_v2
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations_v2 c
    JOIN public.orbit_profiles_v2 op ON op.id = auth.uid()
    WHERE c.id = chat_messages_v2.conversation_id
    AND (
      c.participants @> jsonb_build_array(jsonb_build_object('orbitId', op.orbit_id))
      OR c.participants @> to_jsonb(ARRAY[op.id::text])
      OR c.participants @> to_jsonb(ARRAY[op.orbit_id])
    )
  )
);

CREATE POLICY "chat_messages_sender_insert" ON public.chat_messages_v2
FOR INSERT TO authenticated
WITH CHECK (sender_user_id = auth.uid());

CREATE POLICY "chat_messages_participants_update" ON public.chat_messages_v2
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations_v2 c
    JOIN public.orbit_profiles_v2 op ON op.id = auth.uid()
    WHERE c.id = chat_messages_v2.conversation_id
    AND (
      c.participants @> jsonb_build_array(jsonb_build_object('orbitId', op.orbit_id))
      OR c.participants @> to_jsonb(ARRAY[op.id::text])
      OR c.participants @> to_jsonb(ARRAY[op.orbit_id])
    )
  )
);