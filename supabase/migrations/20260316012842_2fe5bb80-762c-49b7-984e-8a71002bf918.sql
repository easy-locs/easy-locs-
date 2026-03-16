
-- Add group_type and posting_permission to groups table
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS group_type text NOT NULL DEFAULT 'group';
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS posting_permission text NOT NULL DEFAULT 'everyone';

-- Add is_pinned to group_messages
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS pinned_at timestamptz;
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS pinned_by uuid;

-- Add comment for clarity
COMMENT ON COLUMN public.groups.group_type IS 'group | channel | community';
COMMENT ON COLUMN public.groups.posting_permission IS 'everyone | admins_only';
