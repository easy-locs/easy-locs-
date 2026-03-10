
-- Phase 2: Add unified context columns to messages table

ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS context_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS context_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS assigned_to uuid DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_context ON public.messages (org_id, context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_messages_assigned ON public.messages (assigned_to) WHERE assigned_to IS NOT NULL;

-- Backfill: cast uuid columns to text for COALESCE
UPDATE public.messages SET 
  context_type = CASE 
    WHEN booking_type = 'marketplace' THEN 'marketplace_booking'
    WHEN booking_type = 'concierge' THEN 'concierge_booking'
    WHEN booking_type = 'seasonal' THEN 'seasonal_booking'
    WHEN tenant_id IS NOT NULL AND booking_id IS NULL THEN 'tenant'
    ELSE 'general'
  END,
  context_id = COALESCE(booking_id, tenant_id::text)
WHERE context_type IS NULL;

COMMENT ON COLUMN public.messages.context_type IS 'Unified context type for thread identification';
COMMENT ON COLUMN public.messages.context_id IS 'ID of linked record';
COMMENT ON COLUMN public.messages.assigned_to IS 'Team member assigned to this thread';
