-- Fix: remove the ALTER PUBLICATION line that already exists
-- Just add the dedup unique index
CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_dedup_key_unique
ON public.notifications(user_id, dedup_key)
WHERE dedup_key IS NOT NULL;