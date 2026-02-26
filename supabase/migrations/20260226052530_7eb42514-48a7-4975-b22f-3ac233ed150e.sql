-- Add user_type column to profiles
ALTER TABLE public.profiles ADD COLUMN user_type text NOT NULL DEFAULT 'landlord';

-- Add comment
COMMENT ON COLUMN public.profiles.user_type IS 'Either landlord or tenant';