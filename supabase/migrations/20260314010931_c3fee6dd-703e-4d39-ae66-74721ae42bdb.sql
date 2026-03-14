
-- 1. Add username column to profiles with unique constraint
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (lower(username)) WHERE username IS NOT NULL;

-- 2. Add view_once columns to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS view_once boolean DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS view_once_opened_at timestamptz;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS view_once_opened_by uuid;
