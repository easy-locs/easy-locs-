
-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  user_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id),
  tenant_id UUID REFERENCES public.tenants(id),
  assigned_to UUID,
  subject TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  recurrence TEXT NOT NULL DEFAULT 'once',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  notify_participants BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read tasks" ON public.tasks
  FOR SELECT USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can insert tasks" ON public.tasks
  FOR INSERT WITH CHECK (is_org_member(auth.uid(), org_id) AND user_id = auth.uid());

CREATE POLICY "Org members can update tasks" ON public.tasks
  FOR UPDATE USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Owner can delete tasks" ON public.tasks
  FOR DELETE USING (user_id = auth.uid() AND is_org_member(auth.uid(), org_id));
