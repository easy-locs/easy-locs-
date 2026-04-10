
-- Create listing_type enum
CREATE TYPE public.listing_type AS ENUM ('short_term_stay', 'long_term_rental', 'hotel', 'sale');

-- Add listing_type column with default for backward compat
ALTER TABLE public.public_listings
  ADD COLUMN listing_type public.listing_type NOT NULL DEFAULT 'short_term_stay';

-- Create index for filtering
CREATE INDEX idx_public_listings_listing_type ON public.public_listings (listing_type);
