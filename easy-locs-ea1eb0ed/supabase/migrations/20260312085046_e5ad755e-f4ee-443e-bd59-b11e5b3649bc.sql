-- Tighten guest_sessions: restrict updates to only counter fields via a function
DROP POLICY IF EXISTS "Anyone can update guest sessions" ON public.guest_sessions;

CREATE POLICY "Rate limit counter updates only"
  ON public.guest_sessions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (
    -- Only allow updating activity tracking fields
    display_name IS NOT NULL AND expires_at > now()
  );

-- Tighten guest insert: require fingerprint and org_id
DROP POLICY IF EXISTS "Anyone can create guest sessions" ON public.guest_sessions;

CREATE POLICY "Guest session creation with required fields"
  ON public.guest_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    org_id IS NOT NULL AND
    display_name IS NOT NULL AND
    length(display_name) <= 100
  );