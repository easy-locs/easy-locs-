
-- Add privacy/visibility columns to user_presence for nearby discovery
ALTER TABLE public.user_presence 
  ADD COLUMN IF NOT EXISTS visible_on_nearby boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS location_sharing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sharing_expires_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS who_can_see text NOT NULL DEFAULT 'contacts',
  ADD COLUMN IF NOT EXISTS professional_category text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS display_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS avatar_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

-- RLS policy: anyone authenticated can read presence of visible users
CREATE POLICY "Read visible presence" ON public.user_presence
  FOR SELECT TO authenticated
  USING (visible_on_nearby = true OR user_id = auth.uid());
