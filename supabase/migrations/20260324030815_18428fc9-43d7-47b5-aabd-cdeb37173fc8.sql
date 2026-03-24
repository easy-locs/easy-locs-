-- Stay availability and rates system for Travel/Stay calendar
CREATE TABLE IF NOT EXISTS public.stay_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL,
  room_type text NOT NULL DEFAULT 'standard',
  date date NOT NULL,
  available boolean NOT NULL DEFAULT true,
  price_per_night numeric(10,2),
  currency text NOT NULL DEFAULT 'AED',
  min_nights integer NOT NULL DEFAULT 1,
  max_guests integer NOT NULL DEFAULT 2,
  rooms_total integer NOT NULL DEFAULT 1,
  rooms_booked integer NOT NULL DEFAULT 0,
  blackout boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(merchant_id, room_type, date)
);

-- Stay bookings
CREATE TABLE IF NOT EXISTS public.stay_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL,
  guest_user_id uuid,
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  guest_phone text,
  room_type text NOT NULL DEFAULT 'standard',
  check_in date NOT NULL,
  check_out date NOT NULL,
  nights integer NOT NULL,
  guests_count integer NOT NULL DEFAULT 1,
  rooms_count integer NOT NULL DEFAULT 1,
  price_per_night numeric(10,2) NOT NULL,
  total_amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'AED',
  status text NOT NULL DEFAULT 'pending',
  payment_intent_id text,
  special_requests text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stay_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stay_bookings ENABLE ROW LEVEL SECURITY;

-- Public read for availability (anyone can check dates)
CREATE POLICY "Anyone can read availability" ON public.stay_availability FOR SELECT USING (true);

-- Public read for booking status (for tracking)  
CREATE POLICY "Users can read own bookings" ON public.stay_bookings FOR SELECT USING (
  guest_user_id = auth.uid() OR auth.uid() IS NOT NULL
);

-- Authenticated users can create bookings
CREATE POLICY "Authenticated users can book" ON public.stay_bookings FOR INSERT TO authenticated WITH CHECK (true);

-- Enable realtime for availability updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.stay_availability;