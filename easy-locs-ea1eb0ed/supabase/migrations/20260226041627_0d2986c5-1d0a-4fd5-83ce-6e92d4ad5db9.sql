
-- Messages table for landlord-tenant conversations
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  sender_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Org members (landlords) can read messages for their org
CREATE POLICY "Org members can read messages"
ON public.messages FOR SELECT
USING (
  is_org_member(auth.uid(), org_id)
  OR EXISTS (
    SELECT 1 FROM public.tenants
    WHERE tenants.id = messages.tenant_id
    AND tenants.tenant_user_id = auth.uid()
  )
);

-- Org members can send messages
CREATE POLICY "Org members can insert messages"
ON public.messages FOR INSERT
WITH CHECK (
  (is_org_member(auth.uid(), org_id) AND sender_id = auth.uid())
  OR (
    EXISTS (
      SELECT 1 FROM public.tenants
      WHERE tenants.id = messages.tenant_id
      AND tenants.tenant_user_id = auth.uid()
    )
    AND sender_id = auth.uid()
  )
);

-- Org members can update messages (mark as read)
CREATE POLICY "Can update own org messages"
ON public.messages FOR UPDATE
USING (
  is_org_member(auth.uid(), org_id)
  OR EXISTS (
    SELECT 1 FROM public.tenants
    WHERE tenants.id = messages.tenant_id
    AND tenants.tenant_user_id = auth.uid()
  )
);

-- Org members can delete messages
CREATE POLICY "Org members can delete messages"
ON public.messages FOR DELETE
USING (is_org_member(auth.uid(), org_id));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Index for performance
CREATE INDEX idx_messages_tenant_id ON public.messages(tenant_id);
CREATE INDEX idx_messages_org_id ON public.messages(org_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
