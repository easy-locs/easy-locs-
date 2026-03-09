
-- Make tenant_id nullable to support booking-only conversations
ALTER TABLE public.messages ALTER COLUMN tenant_id DROP NOT NULL;

-- Add booking-linked conversation columns
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS booking_id text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS booking_type text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS contact_email text;

-- Index for booking-linked queries
CREATE INDEX IF NOT EXISTS idx_messages_booking_id ON public.messages (booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_booking_type ON public.messages (booking_type) WHERE booking_type IS NOT NULL;
