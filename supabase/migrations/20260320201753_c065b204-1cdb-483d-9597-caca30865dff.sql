-- ============================================================
-- CLEAN UP DUPLICATE / CONFLICTING RLS POLICIES
-- ============================================================

-- 1. conversations_v2: Remove old userId-based policies (keep orbitId-based ones)
DROP POLICY IF EXISTS "Participants read conversations" ON public.conversations_v2;
DROP POLICY IF EXISTS "Participants update conversations" ON public.conversations_v2;

-- 2. chat_messages_v2: Remove old/conflicting policies
DROP POLICY IF EXISTS "Read messages in own conversations" ON public.chat_messages_v2;
DROP POLICY IF EXISTS "Send messages to own conversations" ON public.chat_messages_v2;
DROP POLICY IF EXISTS "chat_messages_v2_conversation_read" ON public.chat_messages_v2;
DROP POLICY IF EXISTS "chat_messages_v2_sender_access" ON public.chat_messages_v2;

-- 3. wallet_ledger: Fix overly permissive INSERT
DROP POLICY IF EXISTS "Service insert ledger" ON public.wallet_ledger;
CREATE POLICY "Users insert own ledger entries"
  ON public.wallet_ledger FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 4. payments: Fix overly permissive INSERT  
DROP POLICY IF EXISTS "Service insert payments" ON public.payments;
CREATE POLICY "Users insert own payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
