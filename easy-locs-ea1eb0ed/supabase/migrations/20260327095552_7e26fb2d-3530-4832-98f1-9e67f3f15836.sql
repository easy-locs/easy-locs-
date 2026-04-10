
CREATE TABLE IF NOT EXISTS public.hotel_inventory_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_type_id uuid NOT NULL REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  rate_plan_id uuid REFERENCES public.hotel_rate_plans(id) ON DELETE SET NULL,
  night_date date NOT NULL,
  available boolean NOT NULL DEFAULT true,
  available_units integer NOT NULL DEFAULT 1,
  base_price numeric NOT NULL DEFAULT 0,
  final_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'AED',
  taxes_amount numeric NOT NULL DEFAULT 0,
  fees_amount numeric NOT NULL DEFAULT 0,
  min_stay integer NOT NULL DEFAULT 1,
  max_stay integer NOT NULL DEFAULT 30,
  closed_to_arrival boolean NOT NULL DEFAULT false,
  closed_to_departure boolean NOT NULL DEFAULT false,
  restriction_notes text,
  source_type text,
  source_entity_id text,
  source_last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, room_type_id, rate_plan_id, night_date)
);

CREATE INDEX IF NOT EXISTS idx_hic_hotel_date ON public.hotel_inventory_calendar (hotel_id, night_date);
CREATE INDEX IF NOT EXISTS idx_hic_room_date ON public.hotel_inventory_calendar (room_type_id, night_date);
CREATE INDEX IF NOT EXISTS idx_hic_plan_date ON public.hotel_inventory_calendar (rate_plan_id, night_date);
CREATE INDEX IF NOT EXISTS idx_hic_avail ON public.hotel_inventory_calendar (hotel_id, night_date) WHERE available = true;

ALTER TABLE public.hotel_inventory_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read hotel_inventory_calendar" ON public.hotel_inventory_calendar FOR SELECT USING (true);
CREATE POLICY "Service insert hotel_inventory_calendar" ON public.hotel_inventory_calendar FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update hotel_inventory_calendar" ON public.hotel_inventory_calendar FOR UPDATE USING (true) WITH CHECK (true);
