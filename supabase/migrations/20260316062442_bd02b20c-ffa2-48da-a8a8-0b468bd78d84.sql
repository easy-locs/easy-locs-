
-- ============================================================
-- PASS70: Delivery System — Database Schema
-- ============================================================

-- Driver Sessions (online/offline tracking)
CREATE TABLE IF NOT EXISTS public.driver_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID REFERENCES public.orgs(id),
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'busy', 'on_delivery', 'break')),
  vehicle_type TEXT NOT NULL DEFAULT 'car' CHECK (vehicle_type IN ('bicycle', 'scooter', 'car', 'van', 'truck')),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  max_distance_km DOUBLE PRECISION DEFAULT 15,
  current_job_id UUID,
  online_since TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ DEFAULT now(),
  total_completed INTEGER DEFAULT 0,
  total_cancelled INTEGER DEFAULT 0,
  acceptance_rate NUMERIC(3,2) DEFAULT 0.95,
  avg_rating NUMERIC(2,1) DEFAULT 5.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Delivery Jobs
CREATE TABLE IF NOT EXISTS public.delivery_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  seller_id UUID NOT NULL,
  order_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'assigned', 'accepted', 'in_progress', 'completed', 'cancelled', 'disputed')),
  priority TEXT NOT NULL DEFAULT 'standard' CHECK (priority IN ('standard', 'express', 'urgent')),
  pickup_address TEXT NOT NULL DEFAULT '',
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  dropoff_address TEXT NOT NULL DEFAULT '',
  dropoff_lat DOUBLE PRECISION,
  dropoff_lng DOUBLE PRECISION,
  package_description TEXT DEFAULT '',
  weight_kg NUMERIC(6,2) DEFAULT 1,
  required_vehicles TEXT[] DEFAULT '{}',
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  driver_id UUID,
  assigned_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID,
  cancellation_reason TEXT,
  confirmation_code TEXT,
  photo_proof_url TEXT,
  reassignment_count INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Delivery Offers (driver bids on jobs)
CREATE TABLE IF NOT EXISTS public.delivery_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.delivery_jobs(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL,
  org_id UUID REFERENCES public.orgs(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'withdrawn')),
  proposed_fee NUMERIC(10,2),
  eta_minutes INTEGER,
  distance_km NUMERIC(6,2),
  score INTEGER DEFAULT 0,
  message TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE(job_id, driver_id)
);

-- Delivery Ratings
CREATE TABLE IF NOT EXISTS public.delivery_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.delivery_jobs(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL,
  rated_by UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  categories TEXT[] DEFAULT '{}',
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id, rated_by)
);

-- Delivery Disputes
CREATE TABLE IF NOT EXISTS public.delivery_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.delivery_jobs(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.orgs(id),
  raised_by UUID NOT NULL,
  raised_by_role TEXT NOT NULL CHECK (raised_by_role IN ('seller', 'buyer', 'driver')),
  reason TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'escalated')),
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  evidence_urls JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_driver_sessions_status ON public.driver_sessions(status);
CREATE INDEX IF NOT EXISTS idx_driver_sessions_user ON public.driver_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_org ON public.delivery_jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_driver ON public.delivery_jobs(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_status ON public.delivery_jobs(status);
CREATE INDEX IF NOT EXISTS idx_delivery_offers_job ON public.delivery_offers(job_id);
CREATE INDEX IF NOT EXISTS idx_delivery_offers_driver ON public.delivery_offers(driver_id);

-- RLS
ALTER TABLE public.driver_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_disputes ENABLE ROW LEVEL SECURITY;

-- driver_sessions: drivers manage their own sessions
CREATE POLICY "driver_sessions_own" ON public.driver_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- driver_sessions: org members can view sessions in their org
CREATE POLICY "driver_sessions_org_read" ON public.driver_sessions
  FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND public.get_org_role(auth.uid(), org_id) IS NOT NULL);

-- delivery_jobs: seller or org member can manage
CREATE POLICY "delivery_jobs_seller" ON public.delivery_jobs
  FOR ALL TO authenticated
  USING (seller_id = auth.uid() OR public.get_org_role(auth.uid(), org_id) IS NOT NULL)
  WITH CHECK (seller_id = auth.uid() OR public.get_org_role(auth.uid(), org_id) IS NOT NULL);

-- delivery_jobs: assigned driver can view/update
CREATE POLICY "delivery_jobs_driver" ON public.delivery_jobs
  FOR SELECT TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "delivery_jobs_driver_update" ON public.delivery_jobs
  FOR UPDATE TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

-- delivery_offers: driver manages own offers
CREATE POLICY "delivery_offers_driver" ON public.delivery_offers
  FOR ALL TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

-- delivery_offers: job seller can view offers
CREATE POLICY "delivery_offers_seller_read" ON public.delivery_offers
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.delivery_jobs dj 
    WHERE dj.id = job_id AND (dj.seller_id = auth.uid() OR public.get_org_role(auth.uid(), dj.org_id) IS NOT NULL)
  ));

-- delivery_ratings: rated_by can insert, anyone in job can read
CREATE POLICY "delivery_ratings_insert" ON public.delivery_ratings
  FOR INSERT TO authenticated
  WITH CHECK (rated_by = auth.uid());

CREATE POLICY "delivery_ratings_read" ON public.delivery_ratings
  FOR SELECT TO authenticated
  USING (rated_by = auth.uid() OR driver_id = auth.uid());

-- delivery_disputes: raised_by can manage, org members can view
CREATE POLICY "delivery_disputes_own" ON public.delivery_disputes
  FOR ALL TO authenticated
  USING (raised_by = auth.uid())
  WITH CHECK (raised_by = auth.uid());

CREATE POLICY "delivery_disputes_org_read" ON public.delivery_disputes
  FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND public.get_org_role(auth.uid(), org_id) IS NOT NULL);

-- Enable realtime for delivery_jobs (live tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_jobs;
