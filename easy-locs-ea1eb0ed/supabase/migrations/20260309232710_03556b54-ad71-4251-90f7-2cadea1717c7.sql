
-- Add preferred_locale to profiles for language targeting
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_locale text DEFAULT 'en';

-- Add preferred_locale to tenants for tenant-specific language
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS preferred_locale text DEFAULT NULL;

-- Comment
COMMENT ON COLUMN public.profiles.preferred_locale IS 'User preferred language code (en, fr, es, de, it, pt, etc.)';
COMMENT ON COLUMN public.tenants.preferred_locale IS 'Tenant preferred language for emails and communications';
