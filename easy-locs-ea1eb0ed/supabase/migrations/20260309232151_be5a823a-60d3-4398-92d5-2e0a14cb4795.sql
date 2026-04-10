
-- Add inbound email tracking columns to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS inbound_message_id text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_chain_id text;

-- Index for matching inbound emails to threads
CREATE INDEX IF NOT EXISTS idx_messages_inbound_id ON public.messages (inbound_message_id) WHERE inbound_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_reply_chain ON public.messages (reply_chain_id) WHERE reply_chain_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_contact_email ON public.messages (contact_email) WHERE contact_email IS NOT NULL;
