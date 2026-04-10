
-- Live tracking table for Deliveroo/Uber-style GPS tracking
CREATE TABLE public.live_trackings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  tracker_user_id UUID NOT NULL,
  viewer_user_id UUID,
  context_type TEXT NOT NULL DEFAULT 'delivery',
  context_id TEXT,
  context_label TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','en_route','nearby','arrived','completed','cancelled')),
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  origin_lat DOUBLE PRECISION,
  origin_lng DOUBLE PRECISION,
  eta_minutes INTEGER,
  route_polyline TEXT,
  speed_kmh DOUBLE PRECISION DEFAULT 0,
  heading DOUBLE PRECISION DEFAULT 0,
  last_position_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_trackings ENABLE ROW LEVEL SECURITY;

-- Tracker can update their own tracking
CREATE POLICY "tracker_manage" ON public.live_trackings
  FOR ALL TO authenticated
  USING (tracker_user_id = auth.uid())
  WITH CHECK (tracker_user_id = auth.uid());

-- Viewer can read their trackings
CREATE POLICY "viewer_read" ON public.live_trackings
  FOR SELECT TO authenticated
  USING (viewer_user_id = auth.uid());

-- Org members can read org trackings
CREATE POLICY "org_read" ON public.live_trackings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.org_members WHERE org_id = live_trackings.org_id AND user_id = auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_trackings;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_trackings TO authenticated;
