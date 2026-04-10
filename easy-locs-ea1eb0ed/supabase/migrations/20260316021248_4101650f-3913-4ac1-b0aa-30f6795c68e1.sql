
-- ═══ PASS55 Block G: Service Tracking Sessions ═══
-- Deliveroo/Uber-style GPS tracking for deliveries, visits, interventions

CREATE TABLE public.tracking_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  tracker_user_id uuid NOT NULL,
  context_type text NOT NULL DEFAULT 'intervention',
  context_id text,
  context_label text,
  status text NOT NULL DEFAULT 'pending',
  current_lat double precision,
  current_lng double precision,
  destination_lat double precision,
  destination_lng double precision,
  destination_label text,
  eta_minutes integer,
  started_at timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz,
  route_polyline text,
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tracking_sessions_org ON public.tracking_sessions(org_id);
CREATE INDEX idx_tracking_sessions_tracker ON public.tracking_sessions(tracker_user_id);
CREATE INDEX idx_tracking_sessions_status ON public.tracking_sessions(status) WHERE status IN ('active', 'en_route', 'nearby');
CREATE INDEX idx_tracking_sessions_context ON public.tracking_sessions(context_type, context_id);

-- Tracking position history for replay / audit
CREATE TABLE public.tracking_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.tracking_sessions(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  speed_kmh double precision,
  heading double precision,
  accuracy_m double precision,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tracking_positions_session ON public.tracking_positions(session_id, recorded_at DESC);

-- RLS
ALTER TABLE public.tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_positions ENABLE ROW LEVEL SECURITY;

-- Org members can view tracking sessions
CREATE POLICY "Org members can view tracking sessions"
  ON public.tracking_sessions FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));

-- Tracker can update their own sessions
CREATE POLICY "Tracker can update own sessions"
  ON public.tracking_sessions FOR UPDATE TO authenticated
  USING (tracker_user_id = auth.uid());

-- Staff+ can create tracking sessions
CREATE POLICY "Staff can create tracking sessions"
  ON public.tracking_sessions FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role(auth.uid(), org_id, 'staff'));

-- Positions: org members read, tracker writes
CREATE POLICY "Org members can view positions"
  ON public.tracking_positions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tracking_sessions ts
    WHERE ts.id = session_id AND public.is_org_member(auth.uid(), ts.org_id)
  ));

CREATE POLICY "Tracker can insert positions"
  ON public.tracking_positions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tracking_sessions ts
    WHERE ts.id = session_id AND ts.tracker_user_id = auth.uid()
  ));

-- Enable realtime for live tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking_sessions;
