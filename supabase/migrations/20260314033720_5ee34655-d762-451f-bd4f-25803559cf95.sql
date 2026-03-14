ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS privacy_online_status boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS privacy_link_previews boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS orbit_notifications boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS orbit_message_preview boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS orbit_media_auto_download boolean DEFAULT true;