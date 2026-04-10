-- Contact click analytics tracking for public listings
CREATE TABLE IF NOT EXISTS public.contact_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NULL,
  service_id uuid NULL,
  org_id uuid NULL,
  channel text NOT NULL, -- whatsapp, telegram, call, sms, email, share
  visitor_fingerprint text NULL,
  referrer text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_clicks ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public tracking from anonymous visitors)
CREATE POLICY "Anyone can insert contact clicks"
ON public.contact_clicks FOR INSERT
WITH CHECK (true);

-- Only org members can read analytics
CREATE POLICY "Org members can read contact clicks"
ON public.contact_clicks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = auth.uid()
    AND om.org_id = contact_clicks.org_id
  )
);

-- Index for analytics queries
CREATE INDEX idx_contact_clicks_org_created ON public.contact_clicks (org_id, created_at DESC);
CREATE INDEX idx_contact_clicks_listing ON public.contact_clicks (listing_id, created_at DESC);
CREATE INDEX idx_contact_clicks_service ON public.contact_clicks (service_id, created_at DESC);