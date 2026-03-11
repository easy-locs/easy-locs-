
-- Add unique constraint: one review per booking
ALTER TABLE public.marketplace_reviews 
ADD CONSTRAINT marketplace_reviews_booking_id_unique UNIQUE (booking_id);

-- Add verified column to track reviews linked to real completed bookings
ALTER TABLE public.marketplace_reviews 
ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;
