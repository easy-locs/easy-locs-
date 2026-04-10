
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS privacy_last_seen boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS privacy_online_status boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS privacy_profile_photo boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS privacy_link_previews boolean DEFAULT true;
