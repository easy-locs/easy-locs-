-- Add notified_at column to booking_requests for idempotency tracking
ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS notified_at timestamptz DEFAULT NULL;