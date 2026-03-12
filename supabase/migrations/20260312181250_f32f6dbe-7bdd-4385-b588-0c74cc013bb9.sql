
-- Add message action columns to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS starred boolean DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_for_sender boolean DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_for_all boolean DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;
