-- ═══════════════════════════════════════════════════════════════════
-- Legal Compliance Migration — GDPR, PSD2, Audit Trail
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Financial Audit Trail (immutable, insert-only) ──────────────
CREATE TABLE IF NOT EXISTS public.financial_audit_trail (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  transaction_type text NOT NULL,
  amount numeric(15, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  counterparty_id uuid,
  reference_id text,
  reference_type text,
  payment_method text,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'completed',
  metadata jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.financial_audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit trail"
  ON public.financial_audit_trail FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert own audit trail"
  ON public.financial_audit_trail FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can insert audit trail"
  ON public.financial_audit_trail FOR INSERT TO service_role
  WITH CHECK (true);

REVOKE UPDATE, DELETE ON public.financial_audit_trail FROM PUBLIC;
REVOKE UPDATE, DELETE ON public.financial_audit_trail FROM authenticated;
REVOKE UPDATE, DELETE ON public.financial_audit_trail FROM anon;

CREATE OR REPLACE FUNCTION public.fn_block_audit_trail_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'financial_audit_trail is immutable — UPDATE and DELETE are prohibited (GDPR Art. 30)';
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_block_audit_update
  BEFORE UPDATE ON public.financial_audit_trail
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_audit_trail_mutation();

CREATE TRIGGER trg_block_audit_delete
  BEFORE DELETE ON public.financial_audit_trail
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_audit_trail_mutation();

CREATE INDEX idx_fat_user_id ON public.financial_audit_trail (user_id);
CREATE INDEX idx_fat_created_at ON public.financial_audit_trail (created_at);
CREATE INDEX idx_fat_transaction_type ON public.financial_audit_trail (transaction_type);
CREATE INDEX idx_fat_reference ON public.financial_audit_trail (reference_type, reference_id);

COMMENT ON TABLE public.financial_audit_trail IS
  'Immutable financial audit log — insert-only, no UPDATE/DELETE. GDPR Art. 30 & PSD2 compliance.';

CREATE OR REPLACE FUNCTION public.fn_audit_wallet_transaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.financial_audit_trail (
    user_id, transaction_type, amount, currency,
    counterparty_id, reference_id, reference_type,
    payment_method, status, metadata
  ) VALUES (
    COALESCE(NEW.user_id, NEW.sender_id, NEW.owner_user_id),
    COALESCE(NEW.type, NEW.transaction_type, 'wallet_transaction'),
    COALESCE(NEW.amount, 0),
    COALESCE(NEW.currency, 'EUR'),
    NEW.recipient_id,
    NEW.id::text,
    'wallet_transaction',
    COALESCE((NEW.metadata->>'payment_method')::text, 'wallet'),
    COALESCE(NEW.status, 'completed'),
    jsonb_build_object('source', 'db_trigger', 'table', TG_TABLE_NAME)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wallet_transactions') THEN
    DROP TRIGGER IF EXISTS trg_audit_wallet_tx ON public.wallet_transactions;
    CREATE TRIGGER trg_audit_wallet_tx
      AFTER INSERT ON public.wallet_transactions
      FOR EACH ROW EXECUTE FUNCTION public.fn_audit_wallet_transaction();
  END IF;
END $$;

-- ── 2. Cookie consent log ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cookie_consent_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  session_id text,
  analytics_accepted boolean NOT NULL DEFAULT false,
  marketing_accepted boolean NOT NULL DEFAULT false,
  consent_version int NOT NULL DEFAULT 1,
  ip_address text,
  user_agent text,
  consented_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.cookie_consent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own consent log"
  ON public.cookie_consent_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert own consent log"
  ON public.cookie_consent_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

REVOKE UPDATE, DELETE ON public.cookie_consent_log FROM PUBLIC;
REVOKE UPDATE, DELETE ON public.cookie_consent_log FROM authenticated;
REVOKE UPDATE, DELETE ON public.cookie_consent_log FROM anon;
REVOKE INSERT ON public.cookie_consent_log FROM anon;

CREATE INDEX idx_ccl_user_id ON public.cookie_consent_log (user_id);

-- ── 3. Marketing preferences column on profiles ────────────────────
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketing_preferences jsonb DEFAULT '{}';
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deletion_completed_at timestamptz;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deletion_scheduled_for timestamptz;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Column additions skipped: %', SQLERRM;
END $$;

-- ── 4. GDPR deletion cleanup cron (runs daily) ────────────────────
CREATE OR REPLACE FUNCTION public.execute_scheduled_deletions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id, email FROM profiles
    WHERE deletion_scheduled_for IS NOT NULL
      AND deletion_scheduled_for <= now()
      AND status = 'pending_deletion'
    LIMIT 50
  LOOP
    DELETE FROM app_notifications WHERE user_id = rec.id;
    DELETE FROM favorites WHERE user_id = rec.id;
    DELETE FROM reviews WHERE user_id = rec.id;
    DELETE FROM support_tickets WHERE user_id = rec.id;
    DELETE FROM user_notification_preferences WHERE user_id = rec.id;
    DELETE FROM user_push_tokens WHERE user_id = rec.id;

    UPDATE owner_profiles
    SET company_name = 'deleted_user_' || left(rec.id::text, 8),
        phone = NULL,
        address = NULL,
        siret = NULL
    WHERE user_id = rec.id;

    UPDATE bookings
    SET notes = NULL, special_requests = NULL
    WHERE user_id = rec.id;

    UPDATE documents
    SET file_name = 'deleted', description = NULL
    WHERE user_id = rec.id;

    UPDATE profiles
    SET status = 'deleted',
        name = 'deleted_user_' || left(rec.id::text, 8),
        email = 'deleted_' || left(rec.id::text, 8) || '@anonymized.local',
        phone = NULL,
        avatar_url = NULL,
        signature_url = NULL,
        bio = NULL,
        country = NULL,
        locale = NULL,
        deletion_completed_at = now()
    WHERE id = rec.id;

    INSERT INTO audit_logs (user_id, action, metadata_json)
    VALUES (rec.id, 'gdpr_account_deleted', jsonb_build_object(
      'deleted_at', now()::text,
      'original_email', rec.email,
      'gdpr_article', 'Art. 17 — Right to erasure'
    ));
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.execute_scheduled_deletions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_scheduled_deletions() TO service_role;

DO $cron_gdpr$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('gdpr-scheduled-deletions');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    PERFORM cron.schedule(
      'gdpr-scheduled-deletions',
      '0 3 * * *',
      $cron_body$SELECT public.execute_scheduled_deletions()$cron_body$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'GDPR cron schedule failed: %', SQLERRM;
END;
$cron_gdpr$;
