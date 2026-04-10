-- Backfill conversations_v2 participants to canonical JSONB objects
WITH expanded AS (
  SELECT
    c.id AS conversation_id,
    jsonb_array_elements(c.participants) AS raw_participant
  FROM public.conversations_v2 c
),
normalized AS (
  SELECT
    e.conversation_id,
    CASE
      WHEN jsonb_typeof(e.raw_participant) = 'object' THEN
        jsonb_build_object(
          'orbitId', COALESCE(e.raw_participant->>'orbitId', op_obj.orbit_id),
          'userId', COALESCE(e.raw_participant->>'userId', op_obj.id::text),
          'email', COALESCE(e.raw_participant->>'email', op_obj.email),
          'displayName', COALESCE(e.raw_participant->>'displayName', op_obj.display_name)
        )
      WHEN jsonb_typeof(e.raw_participant) = 'string' THEN
        CASE
          WHEN op_uuid.id IS NOT NULL THEN
            jsonb_build_object(
              'orbitId', op_uuid.orbit_id,
              'userId', op_uuid.id::text,
              'email', op_uuid.email,
              'displayName', op_uuid.display_name
            )
          WHEN op_orbit.orbit_id IS NOT NULL THEN
            jsonb_build_object(
              'orbitId', op_orbit.orbit_id,
              'userId', op_orbit.id::text,
              'email', op_orbit.email,
              'displayName', op_orbit.display_name
            )
          ELSE NULL
        END
      ELSE NULL
    END AS participant_obj
  FROM expanded e
  LEFT JOIN public.orbit_profiles_v2 op_uuid
    ON jsonb_typeof(e.raw_participant) = 'string'
    AND trim(both '"' from e.raw_participant::text) = op_uuid.id::text
  LEFT JOIN public.orbit_profiles_v2 op_orbit
    ON jsonb_typeof(e.raw_participant) = 'string'
    AND trim(both '"' from e.raw_participant::text) = op_orbit.orbit_id
  LEFT JOIN public.orbit_profiles_v2 op_obj
    ON jsonb_typeof(e.raw_participant) = 'object'
    AND (
      (e.raw_participant->>'userId' IS NOT NULL AND e.raw_participant->>'userId' = op_obj.id::text)
      OR (e.raw_participant->>'orbitId' IS NOT NULL AND e.raw_participant->>'orbitId' = op_obj.orbit_id)
    )
),
rebuilt AS (
  SELECT
    conversation_id,
    jsonb_agg(participant_obj ORDER BY participant_obj->>'orbitId') FILTER (WHERE participant_obj IS NOT NULL) AS new_participants
  FROM normalized
  GROUP BY conversation_id
)
UPDATE public.conversations_v2 c
SET participants = r.new_participants
FROM rebuilt r
WHERE c.id = r.conversation_id
  AND r.new_participants IS NOT NULL
  AND jsonb_array_length(r.new_participants) > 0;

-- Harden RLS: conversations_v2
DROP POLICY IF EXISTS "conversations_participants_read" ON public.conversations_v2;
DROP POLICY IF EXISTS "conversations_creator_insert" ON public.conversations_v2;
DROP POLICY IF EXISTS "conversations_participants_update" ON public.conversations_v2;
DROP POLICY IF EXISTS "Users can read own conversations" ON public.conversations_v2;
DROP POLICY IF EXISTS "Users can insert own conversations" ON public.conversations_v2;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations_v2;
DROP POLICY IF EXISTS "Authenticated can read conversations" ON public.conversations_v2;
DROP POLICY IF EXISTS "Authenticated can insert conversations" ON public.conversations_v2;
DROP POLICY IF EXISTS "Authenticated can update conversations" ON public.conversations_v2;

CREATE POLICY "conversations_participants_read"
ON public.conversations_v2
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orbit_profiles_v2 op
    WHERE op.id = auth.uid()
      AND conversations_v2.participants @> jsonb_build_array(jsonb_build_object('orbitId', op.orbit_id))
  )
);

CREATE POLICY "conversations_creator_insert"
ON public.conversations_v2
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orbit_profiles_v2 op
    WHERE op.id = auth.uid()
      AND conversations_v2.created_by_orbit_id = op.orbit_id
      AND conversations_v2.participants @> jsonb_build_array(jsonb_build_object('orbitId', op.orbit_id))
  )
);

CREATE POLICY "conversations_participants_update"
ON public.conversations_v2
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orbit_profiles_v2 op
    WHERE op.id = auth.uid()
      AND conversations_v2.participants @> jsonb_build_array(jsonb_build_object('orbitId', op.orbit_id))
  )
);

-- Harden RLS: chat_messages_v2
DROP POLICY IF EXISTS "chat_messages_participants_read" ON public.chat_messages_v2;
DROP POLICY IF EXISTS "chat_messages_sender_insert" ON public.chat_messages_v2;
DROP POLICY IF EXISTS "chat_messages_participants_update" ON public.chat_messages_v2;
DROP POLICY IF EXISTS "Users can read messages" ON public.chat_messages_v2;
DROP POLICY IF EXISTS "Users can insert messages" ON public.chat_messages_v2;
DROP POLICY IF EXISTS "Users can update messages" ON public.chat_messages_v2;
DROP POLICY IF EXISTS "Authenticated can read messages" ON public.chat_messages_v2;
DROP POLICY IF EXISTS "Authenticated can insert messages" ON public.chat_messages_v2;
DROP POLICY IF EXISTS "Authenticated can update messages" ON public.chat_messages_v2;

CREATE POLICY "chat_messages_participants_read"
ON public.chat_messages_v2
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations_v2 c
    JOIN public.orbit_profiles_v2 op ON op.id = auth.uid()
    WHERE c.id = chat_messages_v2.conversation_id
      AND c.participants @> jsonb_build_array(jsonb_build_object('orbitId', op.orbit_id))
  )
);

CREATE POLICY "chat_messages_sender_insert"
ON public.chat_messages_v2
FOR INSERT TO authenticated
WITH CHECK (
  sender_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.conversations_v2 c
    JOIN public.orbit_profiles_v2 op ON op.id = auth.uid()
    WHERE c.id = chat_messages_v2.conversation_id
      AND c.participants @> jsonb_build_array(jsonb_build_object('orbitId', op.orbit_id))
  )
);

CREATE POLICY "chat_messages_participants_update"
ON public.chat_messages_v2
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations_v2 c
    JOIN public.orbit_profiles_v2 op ON op.id = auth.uid()
    WHERE c.id = chat_messages_v2.conversation_id
      AND c.participants @> jsonb_build_array(jsonb_build_object('orbitId', op.orbit_id))
  )
);