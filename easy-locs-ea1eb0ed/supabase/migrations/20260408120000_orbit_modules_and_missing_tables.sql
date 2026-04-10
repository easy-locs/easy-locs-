-- Migration: Orbit modules + remaining app tables
-- Ensures all tables referenced in the codebase exist with proper RLS.
-- Date: 2026-04-08

-- ═══════════════════════════════════════════════════════════════
-- ORBIT MODULE: Contacts, Identity, Calls, Device Keys, Telemetry
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.orbit_contacts_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name text,
  email text,
  phone text,
  orbit_id text,
  avatar_url text,
  is_favorite boolean DEFAULT false,
  is_blocked boolean DEFAULT false,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, contact_user_id)
);
CREATE INDEX IF NOT EXISTS idx_orbit_contacts_v2_user ON public.orbit_contacts_v2(user_id);
ALTER TABLE public.orbit_contacts_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "orbit_contacts_v2_select" ON public.orbit_contacts_v2 FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "orbit_contacts_v2_insert" ON public.orbit_contacts_v2 FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "orbit_contacts_v2_update" ON public.orbit_contacts_v2 FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "orbit_contacts_v2_delete" ON public.orbit_contacts_v2 FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.orbit_identity_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  orbit_id text UNIQUE,
  display_name text,
  bio text,
  avatar_url text,
  banner_url text,
  status_emoji text,
  status_text text,
  ghost_mode boolean DEFAULT false,
  visibility text DEFAULT 'public',
  verified boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.orbit_identity_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "orbit_identity_select" ON public.orbit_identity_profiles FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "orbit_identity_insert" ON public.orbit_identity_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "orbit_identity_update" ON public.orbit_identity_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.orbit_call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL REFERENCES auth.users(id),
  callee_id uuid NOT NULL REFERENCES auth.users(id),
  call_type text DEFAULT 'voice',
  status text DEFAULT 'ringing',
  started_at timestamptz DEFAULT now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer DEFAULT 0,
  quality_score numeric,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.orbit_call_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "orbit_calls_select" ON public.orbit_call_sessions FOR SELECT TO authenticated USING (auth.uid() = caller_id OR auth.uid() = callee_id);
CREATE POLICY IF NOT EXISTS "orbit_calls_insert" ON public.orbit_call_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = caller_id);
CREATE POLICY IF NOT EXISTS "orbit_calls_update" ON public.orbit_call_sessions FOR UPDATE TO authenticated USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE TABLE IF NOT EXISTS public.orbit_call_sessions_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL REFERENCES auth.users(id),
  callee_id uuid NOT NULL REFERENCES auth.users(id),
  call_type text DEFAULT 'voice',
  status text DEFAULT 'ringing',
  started_at timestamptz DEFAULT now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.orbit_call_sessions_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "orbit_calls_v2_select" ON public.orbit_call_sessions_v2 FOR SELECT TO authenticated USING (auth.uid() = caller_id OR auth.uid() = callee_id);
CREATE POLICY IF NOT EXISTS "orbit_calls_v2_insert" ON public.orbit_call_sessions_v2 FOR INSERT TO authenticated WITH CHECK (auth.uid() = caller_id);
CREATE POLICY IF NOT EXISTS "orbit_calls_v2_update" ON public.orbit_call_sessions_v2 FOR UPDATE TO authenticated USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE TABLE IF NOT EXISTS public.orbit_call_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id uuid,
  from_user_id uuid REFERENCES auth.users(id),
  to_user_id uuid REFERENCES auth.users(id),
  signal_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.orbit_call_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "orbit_signals_select" ON public.orbit_call_signals FOR SELECT TO authenticated USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY IF NOT EXISTS "orbit_signals_insert" ON public.orbit_call_signals FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id);

CREATE TABLE IF NOT EXISTS public.orbit_call_signals_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id uuid,
  from_user_id uuid REFERENCES auth.users(id),
  to_user_id uuid REFERENCES auth.users(id),
  signal_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.orbit_call_signals_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "orbit_signals_v2_select" ON public.orbit_call_signals_v2 FOR SELECT TO authenticated USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY IF NOT EXISTS "orbit_signals_v2_insert" ON public.orbit_call_signals_v2 FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id);

CREATE TABLE IF NOT EXISTS public.orbit_device_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  public_key text NOT NULL,
  key_type text DEFAULT 'identity',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  UNIQUE(user_id, device_id, key_type)
);
ALTER TABLE public.orbit_device_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "orbit_keys_select" ON public.orbit_device_keys FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "orbit_keys_insert" ON public.orbit_device_keys FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "orbit_keys_update" ON public.orbit_device_keys FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.orbit_telemetry_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  event_name text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  session_id text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.orbit_telemetry_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "orbit_telemetry_insert" ON public.orbit_telemetry_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "orbit_telemetry_select" ON public.orbit_telemetry_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.orbit_media_open_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  message_id uuid,
  media_type text,
  opened_at timestamptz DEFAULT now()
);
ALTER TABLE public.orbit_media_open_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "orbit_media_logs_insert" ON public.orbit_media_open_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.orbit_launch_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_type text NOT NULL,
  status text DEFAULT 'pass',
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.orbit_launch_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "orbit_audits_select" ON public.orbit_launch_audits FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "orbit_audits_insert" ON public.orbit_launch_audits FOR INSERT TO authenticated WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- CONVERSATION PREFERENCES & BLOCKED USERS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.conversation_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid,
  muted boolean DEFAULT false,
  pinned boolean DEFAULT false,
  archived boolean DEFAULT false,
  notification_level text DEFAULT 'all',
  custom_tone text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);
ALTER TABLE public.conversation_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "conv_prefs_select" ON public.conversation_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "conv_prefs_insert" ON public.conversation_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "conv_prefs_update" ON public.conversation_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "conv_prefs_delete" ON public.conversation_preferences FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "blocked_select" ON public.blocked_users FOR SELECT TO authenticated USING (auth.uid() = blocker_id);
CREATE POLICY IF NOT EXISTS "blocked_insert" ON public.blocked_users FOR INSERT TO authenticated WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY IF NOT EXISTS "blocked_delete" ON public.blocked_users FOR DELETE TO authenticated USING (auth.uid() = blocker_id);

CREATE TABLE IF NOT EXISTS public.conversation_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid,
  parent_message_id uuid,
  title text,
  status text DEFAULT 'open',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.conversation_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "conv_threads_select" ON public.conversation_threads FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "conv_threads_insert" ON public.conversation_threads FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- ═══════════════════════════════════════════════════════════════
-- WALLET MODULE: Complete tables
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.wallet_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'AED',
  balance numeric NOT NULL DEFAULT 0,
  status text DEFAULT 'active',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, currency)
);
ALTER TABLE public.wallet_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "wallet_accounts_select" ON public.wallet_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "wallet_accounts_insert" ON public.wallet_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "wallet_accounts_update" ON public.wallet_accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES auth.users(id),
  recipient_id uuid REFERENCES auth.users(id),
  amount numeric NOT NULL,
  currency text DEFAULT 'AED',
  title text,
  description text,
  status text DEFAULT 'completed',
  type text DEFAULT 'transfer',
  reference text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_sender ON public.wallet_transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_recipient ON public.wallet_transactions(recipient_id);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "wallet_tx_select" ON public.wallet_transactions FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY IF NOT EXISTS "wallet_tx_insert" ON public.wallet_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

CREATE TABLE IF NOT EXISTS public.wallet_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_account_id uuid REFERENCES public.wallet_accounts(id),
  user_id uuid REFERENCES auth.users(id),
  amount numeric NOT NULL,
  balance_after numeric,
  entry_type text NOT NULL,
  reference_id uuid,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.wallet_ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "wallet_ledger_select" ON public.wallet_ledger_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- USER MODULE: Keys, Presence, Preferences, Notifications
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_key_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  identity_key text NOT NULL,
  signed_pre_key text,
  one_time_keys jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_key_bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "user_keys_select" ON public.user_key_bundles FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "user_keys_insert" ON public.user_key_bundles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "user_keys_update" ON public.user_key_bundles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  status text DEFAULT 'offline',
  last_seen_at timestamptz DEFAULT now(),
  device_info jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "user_presence_select" ON public.user_presence FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "user_presence_upsert" ON public.user_presence FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "user_presence_update" ON public.user_presence FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  push_enabled boolean DEFAULT true,
  email_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT false,
  quiet_hours_start time,
  quiet_hours_end time,
  channels jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "user_notif_prefs_select" ON public.user_notification_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "user_notif_prefs_insert" ON public.user_notification_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "user_notif_prefs_update" ON public.user_notification_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- VAULT MODULE: File storage metadata
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.vault_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size bigint DEFAULT 0,
  category text DEFAULT 'general',
  is_encrypted boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.vault_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "vault_files_select" ON public.vault_files FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "vault_files_insert" ON public.vault_files FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "vault_files_delete" ON public.vault_files FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- AI & ONBOARDING ENGINE TABLES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ai_category_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid,
  suggested_category text,
  confidence numeric DEFAULT 0,
  accepted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.ai_category_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "ai_cat_select" ON public.ai_category_suggestions FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.verticals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  color text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.verticals ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "verticals_select" ON public.verticals FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id uuid REFERENCES public.verticals(id),
  key text NOT NULL,
  name text NOT NULL,
  parent_id uuid REFERENCES public.categories(id),
  icon text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(vertical_id, key)
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "categories_select" ON public.categories FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.onboarding_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid,
  entity_type text,
  status text DEFAULT 'pending',
  priority integer DEFAULT 0,
  assigned_to uuid REFERENCES auth.users(id),
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.onboarding_review_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "onb_queue_select" ON public.onboarding_review_queue FOR SELECT TO authenticated USING (auth.uid() = assigned_to);

CREATE TABLE IF NOT EXISTS public.onboarding_review_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES public.onboarding_review_queue(id),
  action_type text NOT NULL,
  performed_by uuid REFERENCES auth.users(id),
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.onboarding_review_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "onb_actions_select" ON public.onboarding_review_actions FOR SELECT TO authenticated USING (auth.uid() = performed_by);

CREATE TABLE IF NOT EXISTS public.onboarding_recrawl_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid,
  url text,
  status text DEFAULT 'pending',
  result jsonb,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.onboarding_recrawl_jobs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.entity_pipeline_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_url text,
  entity_type text,
  status text DEFAULT 'queued',
  priority integer DEFAULT 0,
  result jsonb,
  error text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);
ALTER TABLE public.entity_pipeline_queue ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- ENGINE / BROWSER REPAIR TABLES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.engine_supervisor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_name text NOT NULL,
  status text DEFAULT 'idle',
  last_run_at timestamptz,
  next_run_at timestamptz,
  config jsonb DEFAULT '{}'::jsonb,
  metrics jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.engine_supervisor ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.seed_merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  url text,
  location_text text,
  lat numeric,
  lng numeric,
  status text DEFAULT 'seed',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.seed_merchants ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "seed_merchants_select" ON public.seed_merchants FOR SELECT TO authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════
-- STORAGE BUCKETS (idempotent)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('vault', 'vault', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', false) ON CONFLICT (id) DO NOTHING;
