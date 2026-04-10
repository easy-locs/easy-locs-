
-- User presence table for online/offline/busy/in-call states
CREATE TABLE public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away', 'busy', 'in_call', 'dnd')),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_type TEXT DEFAULT 'web',
  custom_status TEXT
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read presence
CREATE POLICY "Authenticated users can read presence"
  ON public.user_presence FOR SELECT TO authenticated
  USING (true);

-- Users can only update their own presence
CREATE POLICY "Users can upsert own presence"
  ON public.user_presence FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Enable realtime for presence
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;

-- Payment requests table
CREATE TABLE public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  recipient_email TEXT,
  recipient_name TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  context_type TEXT DEFAULT 'general',
  context_id TEXT,
  thread_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_payment_link TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage payment requests"
  ON public.payment_requests FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.org_members WHERE org_id = payment_requests.org_id AND user_id = auth.uid()));

CREATE POLICY "Recipients can view their payment requests"
  ON public.payment_requests FOR SELECT TO authenticated
  USING (recipient_email IN (SELECT email FROM public.profiles WHERE id = auth.uid()));

-- Contacts table
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  contact_user_id UUID,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  category TEXT NOT NULL DEFAULT 'client' CHECK (category IN ('client', 'team', 'professional', 'personal', 'other')),
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  avatar_url TEXT,
  org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own contacts"
  ON public.contacts FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Org members can view org contacts"
  ON public.contacts FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.org_members WHERE org_id = contacts.org_id AND user_id = auth.uid()));
