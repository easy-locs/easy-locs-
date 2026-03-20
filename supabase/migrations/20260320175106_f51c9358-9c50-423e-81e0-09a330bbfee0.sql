
-- Create drivers_live table for real-time driver position tracking
CREATE TABLE IF NOT EXISTS public.drivers_live (
  orbit_id text PRIMARY KEY,
  online boolean NOT NULL DEFAULT false,
  lat double precision,
  lng double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.drivers_live ENABLE ROW LEVEL SECURITY;

-- Anyone can read live drivers (needed for radar/dispatch)
CREATE POLICY "anyone reads live drivers"
ON public.drivers_live FOR SELECT
USING (true);

-- Driver manages own live row
CREATE POLICY "driver manages own live row"
ON public.drivers_live FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.orbit_profiles_v2 op
    WHERE op.id = auth.uid() AND op.orbit_id = drivers_live.orbit_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orbit_profiles_v2 op
    WHERE op.id = auth.uid() AND op.orbit_id = drivers_live.orbit_id
  )
);

-- Enable realtime for drivers_live
ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers_live;
