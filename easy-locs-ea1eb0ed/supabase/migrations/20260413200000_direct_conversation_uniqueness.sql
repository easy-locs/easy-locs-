CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_v2_direct_pair
ON public.conversations_v2 ((metadata->>'direct_user_ids'))
WHERE type = 'direct' AND metadata->>'direct_user_ids' IS NOT NULL;
