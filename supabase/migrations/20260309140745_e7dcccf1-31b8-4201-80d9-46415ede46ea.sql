
-- Fix: Restrict notifications INSERT so users can only insert for themselves
-- Server-side triggers/edge functions use service role and bypass RLS

DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;

CREATE POLICY "Users insert own notifications" ON public.notifications
FOR INSERT WITH CHECK (
  user_id = auth.uid()
);
