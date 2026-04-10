
-- Add missing profile fields for Global Profile Engine (tenant + landlord)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS nationality text DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS city text DEFAULT '',
  ADD COLUMN IF NOT EXISTS postal_code text DEFAULT '',
  ADD COLUMN IF NOT EXISTS id_number text DEFAULT '',
  ADD COLUMN IF NOT EXISTS company_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tax_id text DEFAULT '';
