ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS requested_ride_type text;
ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS assigned_ride_type text;
ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS search_radius_km numeric;