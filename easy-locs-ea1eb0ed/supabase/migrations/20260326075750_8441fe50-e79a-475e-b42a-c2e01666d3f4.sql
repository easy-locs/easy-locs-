
-- ============================================
-- CANONICAL NOTIFICATIONS_V2 TABLE
-- Single source of truth for all notifications
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  actor text NOT NULL DEFAULT 'client' CHECK (actor IN ('client','rider','merchant','admin')),
  domain text NOT NULL DEFAULT 'system' CHECK (domain IN ('mobility','food_delivery','parcel_delivery','wallet','orbit','merchant','admin','system')),
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  data jsonb NOT NULL DEFAULT '{}',
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','critical')),
  delivery_mode text[] NOT NULL DEFAULT '{in_app}',
  read_at timestamptz,
  clicked_at timestamptz,
  dismissed_at timestamptz,
  action_url text,
  orbit_context_id uuid,
  related_job_id uuid,
  related_order_id uuid,
  related_payment_intent_id uuid,
  related_conversation_id uuid,
  dedupe_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nv2_user_created ON public.notifications_v2 (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nv2_user_unread ON public.notifications_v2 (user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_nv2_actor_domain ON public.notifications_v2 (actor, domain, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nv2_job ON public.notifications_v2 (related_job_id) WHERE related_job_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_nv2_dedupe ON public.notifications_v2 (dedupe_key) WHERE dedupe_key IS NOT NULL;

-- RLS
ALTER TABLE public.notifications_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON public.notifications_v2
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications" ON public.notifications_v2
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authenticated insert notifications" ON public.notifications_v2
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.notifications_v2
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications_v2;
