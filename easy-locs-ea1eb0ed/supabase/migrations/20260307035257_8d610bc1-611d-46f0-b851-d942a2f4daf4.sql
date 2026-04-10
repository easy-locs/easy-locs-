
-- Local services table for Activities & Local Services feature
CREATE TABLE public.local_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  photo_url TEXT,
  country TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  whatsapp_number TEXT,
  website_url TEXT,
  price_indication TEXT,
  availability_note TEXT,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.local_services ENABLE ROW LEVEL SECURITY;

-- Org members can manage their own org's services
CREATE POLICY "org_members_manage_services"
ON public.local_services
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.org_members WHERE org_members.org_id = local_services.org_id AND org_members.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.org_members WHERE org_members.org_id = local_services.org_id AND org_members.user_id = auth.uid())
);

-- Public read access for active services (needed for public listing pages)
CREATE POLICY "public_read_active_services"
ON public.local_services
FOR SELECT
TO anon
USING (active = true);

-- Add local_services_enabled flag to orgs
ALTER TABLE public.orgs ADD COLUMN IF NOT EXISTS local_services_enabled BOOLEAN NOT NULL DEFAULT false;
