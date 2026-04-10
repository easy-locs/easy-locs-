-- Enable realtime for ride_events and tracking_positions
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking_positions;