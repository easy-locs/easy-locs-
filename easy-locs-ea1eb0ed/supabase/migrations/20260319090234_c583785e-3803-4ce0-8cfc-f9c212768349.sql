
ALTER TABLE public.saved_addresses 
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS street_name text,
  ADD COLUMN IF NOT EXISTS street_number text,
  ADD COLUMN IF NOT EXISTS landmark text,
  ADD COLUMN IF NOT EXISTS floor text,
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_saved_addresses_user_default 
  ON public.saved_addresses(user_id, is_default DESC, last_used_at DESC NULLS LAST);
