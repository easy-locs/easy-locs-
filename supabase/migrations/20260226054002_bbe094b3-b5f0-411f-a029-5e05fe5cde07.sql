
-- Add signature_url to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_url text DEFAULT NULL;

-- Create document_requests table for tenant quick requests
CREATE TABLE public.document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.orgs(id),
  request_type text NOT NULL DEFAULT 'receipt',
  period text DEFAULT NULL,
  notes text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz DEFAULT NULL
);

ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can create own requests"
ON public.document_requests FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM tenants WHERE tenants.id = document_requests.tenant_id AND tenants.tenant_user_id = auth.uid())
);

CREATE POLICY "Tenants and org members can read requests"
ON public.document_requests FOR SELECT
USING (
  is_org_member(auth.uid(), org_id) OR
  EXISTS (SELECT 1 FROM tenants WHERE tenants.id = document_requests.tenant_id AND tenants.tenant_user_id = auth.uid())
);

CREATE POLICY "Org members can update requests"
ON public.document_requests FOR UPDATE
USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can delete requests"
ON public.document_requests FOR DELETE
USING (is_org_member(auth.uid(), org_id));

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  org_id uuid DEFAULT NULL,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  link text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Authenticated can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (user_id = auth.uid());

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_requests;
