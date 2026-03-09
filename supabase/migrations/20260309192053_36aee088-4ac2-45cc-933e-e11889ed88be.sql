ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS resolved boolean NOT NULL DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS resolved_at timestamptz DEFAULT NULL;