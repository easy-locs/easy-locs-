
-- Add requester_id, recipient_id, payment_tx_id to existing payment_requests table
-- The table already has: sender_id, recipient_email, recipient_name, amount, currency, description, status, context_type, context_id, thread_id, title, subtitle, paid_by, transaction_id, metadata

ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS requester_id uuid null references auth.users(id) on delete cascade;
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS recipient_id uuid null references auth.users(id) on delete set null;
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS payment_tx_id uuid null;

-- Backfill requester_id from sender_id for existing rows
UPDATE public.payment_requests SET requester_id = sender_id WHERE requester_id IS NULL AND sender_id IS NOT NULL;

-- Drop old conflicting policies
DROP POLICY IF EXISTS "pr_select_involved" ON public.payment_requests;
DROP POLICY IF EXISTS "pr_select_pending" ON public.payment_requests;
DROP POLICY IF EXISTS "pr_insert_own" ON public.payment_requests;
DROP POLICY IF EXISTS "pr_update_involved" ON public.payment_requests;
DROP POLICY IF EXISTS "payment_requests_select_own" ON public.payment_requests;
DROP POLICY IF EXISTS "payment_requests_insert_own" ON public.payment_requests;
DROP POLICY IF EXISTS "payment_requests_update_own" ON public.payment_requests;

-- New RLS policies using requester_id + recipient_id
CREATE POLICY "payment_requests_select_own"
ON public.payment_requests FOR SELECT TO authenticated
USING (
  auth.uid() = requester_id
  OR auth.uid() = recipient_id
  OR auth.uid() = sender_id
  OR auth.uid() = paid_by
  OR status = 'pending'
);

CREATE POLICY "payment_requests_insert_own"
ON public.payment_requests FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = requester_id OR auth.uid() = sender_id
);

CREATE POLICY "payment_requests_update_own"
ON public.payment_requests FOR UPDATE TO authenticated
USING (
  auth.uid() = requester_id OR auth.uid() = recipient_id OR auth.uid() = sender_id
)
WITH CHECK (
  auth.uid() = requester_id OR auth.uid() = recipient_id OR auth.uid() = sender_id
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_requests_requester_id ON public.payment_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_recipient_id ON public.payment_requests(recipient_id);
