-- Orbit AI Support Factory — Session, Trace, Message, Quality tables
-- Single canonical support pipeline for the entire platform

-- Support Sessions (AI-first intake)
CREATE TABLE IF NOT EXISTS public.support_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('chat', 'voice')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'ai_handling', 'transferring_to_shop', 'with_shop',
    'shop_unreachable', 'ticket_created', 'escalated_admin',
    'resolved', 'closed', 'abandoned'
  )),
  issue_category text,
  urgency text CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  order_id text,
  shop_id uuid,
  booking_id text,
  routing_target text CHECK (routing_target IN (
    'ai_direct', 'shop_transfer', 'ticket_fallback',
    'admin_escalation', 'callback_scheduled', 'blocked'
  )),
  ai_summary text,
  ai_classification_confidence real,
  language text NOT NULL DEFAULT 'en',
  ticket_id uuid,
  resolved_by text CHECK (resolved_by IN ('ai', 'shop', 'admin', 'system')),
  resolution_summary text,
  shop_transfer_attempts integer NOT NULL DEFAULT 0,
  shop_response_at timestamptz,
  escalation_reason text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_support_sessions_user ON public.support_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_support_sessions_status ON public.support_sessions(status);
CREATE INDEX IF NOT EXISTS idx_support_sessions_shop ON public.support_sessions(shop_id) WHERE shop_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_sessions_created ON public.support_sessions(created_at DESC);

-- Support Messages
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.support_sessions(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('user', 'ai', 'shop', 'system')),
  content text NOT NULL,
  content_type text NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'voice_transcript', 'media', 'system_notice')),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_session ON public.support_messages(session_id, created_at);

-- Support Traces (Evidence / Audit layer)
CREATE TABLE IF NOT EXISTS public.support_traces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.support_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor text NOT NULL CHECK (actor IN ('user', 'ai', 'shop', 'system', 'admin')),
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_traces_session ON public.support_traces(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_support_traces_event ON public.support_traces(event_type);

-- Shop Quality Scores
CREATE TABLE IF NOT EXISTS public.shop_quality_scores (
  shop_id uuid PRIMARY KEY,
  response_rate real NOT NULL DEFAULT 1.0,
  avg_response_time_minutes real NOT NULL DEFAULT 0,
  complaint_rate real NOT NULL DEFAULT 0,
  refund_rate real NOT NULL DEFAULT 0,
  fraud_flags integer NOT NULL DEFAULT 0,
  overall_score real NOT NULL DEFAULT 1.0,
  last_updated timestamptz NOT NULL DEFAULT now()
);

-- Shop Quality Events (non-response, fraud indicators, etc.)
CREATE TABLE IF NOT EXISTS public.shop_quality_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  event_type text NOT NULL,
  session_id uuid,
  severity text NOT NULL DEFAULT 'medium',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_quality_events_shop ON public.shop_quality_events(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_quality_events_type ON public.shop_quality_events(event_type);

-- Learning Insights
CREATE TABLE IF NOT EXISTS public.support_learning_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type text NOT NULL,
  category text,
  description text NOT NULL,
  evidence_count integer NOT NULL DEFAULT 0,
  suggested_action text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'applied', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learning_insights_status ON public.support_learning_insights(status);

-- Orbit Notifications (for shop transfer alerts)
CREATE TABLE IF NOT EXISTS public.orbit_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orbit_notifications_user ON public.orbit_notifications(user_id, read);

-- RLS Policies
ALTER TABLE public.support_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_quality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_quality_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_learning_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orbit_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.support_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sessions" ON public.support_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own messages" ON public.support_messages
  FOR SELECT USING (
    session_id IN (SELECT id FROM public.support_sessions WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert own messages" ON public.support_messages
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM public.support_sessions WHERE user_id = auth.uid())
  );
CREATE POLICY "Service role full access sessions" ON public.support_sessions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access messages" ON public.support_messages
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access traces" ON public.support_traces
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access quality" ON public.shop_quality_scores
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access events" ON public.shop_quality_events
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access insights" ON public.support_learning_insights
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Users can view own notifications" ON public.orbit_notifications
  FOR SELECT USING (auth.uid() = user_id);
