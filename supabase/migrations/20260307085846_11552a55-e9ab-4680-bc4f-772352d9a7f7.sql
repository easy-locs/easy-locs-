
-- Add missing columns to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_url text DEFAULT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'user';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS property_id uuid DEFAULT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS conversation_status text DEFAULT 'active';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS delivered boolean DEFAULT false;
