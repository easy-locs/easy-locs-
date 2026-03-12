-- Add reminder tracking columns to rent_calls
ALTER TABLE public.rent_calls 
  ADD COLUMN IF NOT EXISTS reminder_level integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS due_date date DEFAULT NULL;