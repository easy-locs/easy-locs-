
-- 1) QR targets table
CREATE TABLE IF NOT EXISTS public.qr_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  target_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) RTC config table
CREATE TABLE IF NOT EXISTS public.rtc_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  active boolean NOT NULL DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Ensure columns exist if rtc_config was already created without them
ALTER TABLE public.rtc_config ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE public.rtc_config ADD COLUMN IF NOT EXISTS config jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.rtc_config ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- 4) RLS
ALTER TABLE public.qr_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rtc_config ENABLE ROW LEVEL SECURITY;

-- Allow authenticated reads on both tables
CREATE POLICY "Authenticated can read qr_targets" ON public.qr_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read rtc_config" ON public.rtc_config FOR SELECT TO authenticated USING (true);
