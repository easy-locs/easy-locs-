-- Expand zones table for global support
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='zones' AND column_name='country_code') THEN
    ALTER TABLE public.zones ADD COLUMN country_code text DEFAULT 'AE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='zones' AND column_name='country_name') THEN
    ALTER TABLE public.zones ADD COLUMN country_name text DEFAULT 'United Arab Emirates';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='zones' AND column_name='region_name') THEN
    ALTER TABLE public.zones ADD COLUMN region_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='zones' AND column_name='timezone') THEN
    ALTER TABLE public.zones ADD COLUMN timezone text DEFAULT 'Asia/Dubai';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='zones' AND column_name='currency') THEN
    ALTER TABLE public.zones ADD COLUMN currency text DEFAULT 'AED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='zones' AND column_name='default_language') THEN
    ALTER TABLE public.zones ADD COLUMN default_language text DEFAULT 'en';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='zones' AND column_name='launch_priority') THEN
    ALTER TABLE public.zones ADD COLUMN launch_priority int DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='zones' AND column_name='slug') THEN
    ALTER TABLE public.zones ADD COLUMN slug text;
  END IF;
END$$;

-- Create unique constraint on slug if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'zones_slug_unique') THEN
    CREATE UNIQUE INDEX zones_slug_unique ON public.zones (slug) WHERE slug IS NOT NULL;
  END IF;
END$$;