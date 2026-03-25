ALTER TABLE public.seed_merchants 
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS opening_hours text,
  ADD COLUMN IF NOT EXISTS digital_status text DEFAULT 'locked';