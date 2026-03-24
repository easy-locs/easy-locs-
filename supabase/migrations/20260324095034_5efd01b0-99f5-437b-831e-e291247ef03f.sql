
-- Merchant override tables
CREATE TABLE IF NOT EXISTS public.merchant_field_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL,
  entity_type text NOT NULL DEFAULT 'shop',
  field_key text NOT NULL,
  auto_value_json jsonb,
  merchant_value_json jsonb,
  is_auto_generated boolean NOT NULL DEFAULT true,
  is_merchant_locked boolean NOT NULL DEFAULT false,
  auto_source text,
  override_source text,
  suggestion_available boolean NOT NULL DEFAULT false,
  suggested_value_json jsonb,
  last_auto_update_at timestamptz DEFAULT now(),
  last_merchant_update_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(entity_id, field_key)
);

ALTER TABLE public.merchant_field_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read overrides" ON public.merchant_field_overrides
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Manage overrides" ON public.merchant_field_overrides
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.merchant_override_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  override_id uuid REFERENCES public.merchant_field_overrides(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL,
  field_key text NOT NULL,
  previous_value_json jsonb,
  new_value_json jsonb,
  change_source text NOT NULL,
  change_reason text,
  changed_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.merchant_override_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read override history" ON public.merchant_override_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Insert override history" ON public.merchant_override_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- Notification templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text UNIQUE NOT NULL,
  event_type text NOT NULL,
  notification_type text NOT NULL DEFAULT 'info',
  priority text NOT NULL DEFAULT 'normal',
  default_channel text NOT NULL DEFAULT 'in_app',
  title_template text NOT NULL,
  body_template text,
  subtitle_template text,
  icon_key text,
  cta_label_template text,
  cta_url_template text,
  cooldown_seconds integer DEFAULT 0,
  groupable boolean DEFAULT false,
  group_key_template text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read templates" ON public.notification_templates
  FOR SELECT TO authenticated USING (true);

-- Extend notifications table
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS notification_type text DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS channel text DEFAULT 'in_app',
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS cta_label text,
  ADD COLUMN IF NOT EXISTS cta_url text,
  ADD COLUMN IF NOT EXISTS icon_key text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS progress_percent integer,
  ADD COLUMN IF NOT EXISTS eta_min integer,
  ADD COLUMN IF NOT EXISTS eta_max integer,
  ADD COLUMN IF NOT EXISTS status_code text,
  ADD COLUMN IF NOT EXISTS is_seen boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_actioned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS dedup_key text,
  ADD COLUMN IF NOT EXISTS group_key text,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_dedup 
  ON public.notifications(dedup_key) WHERE dedup_key IS NOT NULL;
