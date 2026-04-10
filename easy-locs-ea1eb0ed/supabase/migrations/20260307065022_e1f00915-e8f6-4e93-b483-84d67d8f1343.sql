
-- Concierge services catalog
CREATE TABLE public.concierge_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'other',
  title text NOT NULL,
  description text DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  duration_minutes integer DEFAULT NULL,
  provider_name text DEFAULT '',
  provider_phone text DEFAULT '',
  photo_url text DEFAULT NULL,
  country text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  property_id uuid REFERENCES public.properties(id) DEFAULT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.concierge_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage concierge services" ON public.concierge_services
  FOR ALL TO authenticated
  USING (is_org_member(auth.uid(), org_id))
  WITH CHECK (is_org_member(auth.uid(), org_id));

CREATE POLICY "Public can read active concierge services" ON public.concierge_services
  FOR SELECT TO anon, authenticated
  USING (active = true);

-- Concierge orders (guest purchases)
CREATE TABLE public.concierge_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.concierge_services(id) ON DELETE CASCADE,
  booking_id uuid DEFAULT NULL,
  property_id uuid REFERENCES public.properties(id) DEFAULT NULL,
  guest_name text NOT NULL DEFAULT '',
  guest_email text NOT NULL DEFAULT '',
  guest_phone text DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'pending',
  scheduled_at timestamptz DEFAULT NULL,
  notes text DEFAULT '',
  payment_status text NOT NULL DEFAULT 'unpaid',
  payment_link_url text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.concierge_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage concierge orders" ON public.concierge_orders
  FOR ALL TO authenticated
  USING (is_org_member(auth.uid(), org_id))
  WITH CHECK (is_org_member(auth.uid(), org_id));

-- Activities / upsells catalog
CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'experience',
  title text NOT NULL,
  description text DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  duration_minutes integer DEFAULT NULL,
  provider_name text DEFAULT '',
  provider_type text NOT NULL DEFAULT 'internal',
  commission_percent numeric DEFAULT 0,
  photo_url text DEFAULT NULL,
  country text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  property_id uuid REFERENCES public.properties(id) DEFAULT NULL,
  active boolean NOT NULL DEFAULT true,
  badges text[] DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage activities" ON public.activities
  FOR ALL TO authenticated
  USING (is_org_member(auth.uid(), org_id))
  WITH CHECK (is_org_member(auth.uid(), org_id));

CREATE POLICY "Public can read active activities" ON public.activities
  FOR SELECT TO anon, authenticated
  USING (active = true);

-- Booking operational tasks
CREATE TABLE public.booking_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) DEFAULT NULL,
  booking_id uuid DEFAULT NULL,
  assigned_to uuid DEFAULT NULL,
  task_type text NOT NULL DEFAULT 'cleaning',
  title text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'medium',
  scheduled_at timestamptz DEFAULT NULL,
  completed_at timestamptz DEFAULT NULL,
  proof_photo_urls jsonb DEFAULT '[]',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage booking tasks" ON public.booking_tasks
  FOR ALL TO authenticated
  USING (is_org_member(auth.uid(), org_id))
  WITH CHECK (is_org_member(auth.uid(), org_id));
