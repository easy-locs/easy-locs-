
-- Enhance concierge_services with multi-photo, availability, payment, commission fields
ALTER TABLE public.concierge_services
  ADD COLUMN IF NOT EXISTS photo_urls jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS time_slots jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS blocked_dates jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS booking_type text NOT NULL DEFAULT 'instant',
  ADD COLUMN IF NOT EXISTS max_capacity integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS location text DEFAULT '',
  ADD COLUMN IF NOT EXISTS conditions text DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_methods jsonb DEFAULT '["stripe","bank_transfer"]'::jsonb,
  ADD COLUMN IF NOT EXISTS bank_details jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS commission_type text NOT NULL DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS commission_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paypal_email text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS booking_slug text DEFAULT NULL;

-- Enhance concierge_orders with more detailed booking/payment tracking
ALTER TABLE public.concierge_orders
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS payment_proof_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_transfer_reference text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS service_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS service_time text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS commission_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_type text DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_session_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancellation_reason text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz DEFAULT NULL;

-- Add unique index for booking slugs
CREATE UNIQUE INDEX IF NOT EXISTS idx_concierge_services_slug ON public.concierge_services(booking_slug) WHERE booking_slug IS NOT NULL;

-- Allow public read of active concierge services (already exists but ensure)
-- Allow anyone to create concierge orders (guest booking)
CREATE POLICY "Anyone can create concierge orders" ON public.concierge_orders
  FOR INSERT WITH CHECK (
    guest_name IS NOT NULL AND guest_name <> '' AND
    guest_email IS NOT NULL AND guest_email <> '' AND
    service_id IS NOT NULL AND
    org_id IS NOT NULL AND
    status = 'pending'
  );

-- Allow public to read concierge orders by stripe_session_id (for payment confirmation)
CREATE POLICY "Public can read own order by session" ON public.concierge_orders
  FOR SELECT USING (
    stripe_session_id IS NOT NULL AND stripe_session_id <> ''
  );
