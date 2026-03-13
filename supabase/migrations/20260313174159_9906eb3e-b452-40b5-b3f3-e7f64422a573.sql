
-- Add edited_at column for message editing
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ DEFAULT NULL;

-- Add disappear_at column for ephemeral messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS disappear_at TIMESTAMPTZ DEFAULT NULL;

-- Add edit_history column to store previous content
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT NULL;
