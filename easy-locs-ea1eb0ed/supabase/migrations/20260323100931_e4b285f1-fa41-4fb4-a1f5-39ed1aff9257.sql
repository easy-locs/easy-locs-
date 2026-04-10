
-- Add canonical geography + capability layers to entities table
ALTER TABLE public.entities 
  ADD COLUMN IF NOT EXISTS district_code text,
  ADD COLUMN IF NOT EXISTS city_code text,
  ADD COLUMN IF NOT EXISTS coverage_type text DEFAULT 'hyperlocal',
  ADD COLUMN IF NOT EXISTS service_modes text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cap_wallet boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cap_qr boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cap_chat boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cap_booking boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cap_delivery boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cap_subscription boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_network_id uuid;

-- Index for geography queries
CREATE INDEX IF NOT EXISTS idx_entities_city_code ON public.entities (city_code);
CREATE INDEX IF NOT EXISTS idx_entities_coverage_type ON public.entities (coverage_type);
CREATE INDEX IF NOT EXISTS idx_entities_vertical_cluster ON public.entities (vertical, cluster);
