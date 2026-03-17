
-- Add missing columns to existing payment_requests table
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS title text null;
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS subtitle text null;
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS paid_by uuid null references auth.users(id) on delete set null;
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS transaction_id uuid null;
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS metadata jsonb not null default '{}'::jsonb;

-- RLS
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pr_select_involved" ON public.payment_requests;
CREATE POLICY "pr_select_involved"
ON public.payment_requests FOR SELECT TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = paid_by);

DROP POLICY IF EXISTS "pr_select_pending" ON public.payment_requests;
CREATE POLICY "pr_select_pending"
ON public.payment_requests FOR SELECT TO authenticated
USING (status = 'pending');

DROP POLICY IF EXISTS "pr_insert_own" ON public.payment_requests;
CREATE POLICY "pr_insert_own"
ON public.payment_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "pr_update_involved" ON public.payment_requests;
CREATE POLICY "pr_update_involved"
ON public.payment_requests FOR UPDATE TO authenticated
USING (auth.uid() = sender_id OR status = 'pending');

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_requests;
