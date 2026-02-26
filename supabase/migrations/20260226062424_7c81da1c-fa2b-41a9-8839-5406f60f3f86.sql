-- Add building_name to properties for grouping lots/units under a building
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS building_name text DEFAULT NULL;

-- Add lot_number for unit identification within a building
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS lot_number text DEFAULT NULL;

-- Add index for building grouping
CREATE INDEX IF NOT EXISTS idx_properties_building ON public.properties(org_id, building_name);