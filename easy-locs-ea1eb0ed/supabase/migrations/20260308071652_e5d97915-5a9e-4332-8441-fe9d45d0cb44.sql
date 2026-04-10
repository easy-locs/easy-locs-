ALTER TABLE public.marketplace_services 
  ADD COLUMN IF NOT EXISTS source_contact_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS source_contact_phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS source_contact_email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS source_contact_notes text DEFAULT '';