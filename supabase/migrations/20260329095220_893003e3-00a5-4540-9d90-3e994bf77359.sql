
-- PHASE 2.1b — RBAC Helper Functions + Audit Enhancement + Masking Utilities

-- =================== RBAC HELPERS ===================

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid, _workspace_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::text FROM public.user_roles
  WHERE user_id = _user_id
    AND (workspace_id = _workspace_id OR (_workspace_id IS NULL AND workspace_id IS NULL))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'super_admin', 'owner')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_org_role(_user_id uuid, _org_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::text FROM public.org_members
  WHERE user_id = _user_id AND org_id = _org_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_view_sensitive_pii(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = _user_id AND org_id = _org_id
      AND role IN ('owner', 'admin', 'agent')
  ) OR public.is_admin(_user_id);
$$;

CREATE OR REPLACE FUNCTION public.role_level(_role text)
RETURNS integer
LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE _role
    WHEN 'super_admin' THEN 120
    WHEN 'owner' THEN 100
    WHEN 'admin' THEN 80
    WHEN 'agent' THEN 60
    WHEN 'staff' THEN 40
    WHEN 'accountant' THEN 30
    WHEN 'member' THEN 20
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.has_min_org_role(_user_id uuid, _org_id uuid, _min_role text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = _user_id AND om.org_id = _org_id
      AND public.role_level(om.role::text) >= public.role_level(_min_role)
  );
$$;

-- =================== DATA MASKING UTILITIES ===================

CREATE OR REPLACE FUNCTION public.mask_email(_email text)
RETURNS text
LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _email IS NULL OR _email = '' THEN NULL
    WHEN position('@' in _email) > 2 THEN
      left(_email, 1) || repeat('*', position('@' in _email) - 2) || substring(_email from position('@' in _email))
    ELSE '***@***'
  END;
$$;

CREATE OR REPLACE FUNCTION public.mask_phone(_phone text)
RETURNS text
LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _phone IS NULL OR length(_phone) < 4 THEN NULL
    ELSE repeat('*', length(_phone) - 4) || right(_phone, 4)
  END;
$$;

CREATE OR REPLACE FUNCTION public.mask_iban(_iban text)
RETURNS text
LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _iban IS NULL OR length(_iban) < 4 THEN NULL
    ELSE repeat('*', length(_iban) - 4) || right(_iban, 4)
  END;
$$;

-- =================== ENHANCED AUDIT LOGS ===================

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_role text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS domain text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS table_name text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS record_id uuid;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS request_id text;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_domain ON public.audit_logs(domain, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON public.audit_logs(table_name, record_id);

-- Audit logging function for triggers
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _action text;
  _record_id uuid;
  _old_data jsonb;
  _new_data jsonb;
BEGIN
  _action := TG_OP;

  IF TG_OP = 'DELETE' THEN
    _record_id := OLD.id;
    _old_data := to_jsonb(OLD);
    _new_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    _record_id := NEW.id;
    _old_data := to_jsonb(OLD);
    _new_data := to_jsonb(NEW);
  ELSE
    _record_id := NEW.id;
    _old_data := NULL;
    _new_data := to_jsonb(NEW);
  END IF;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, domain, metadata_json, created_at)
  VALUES (
    auth.uid(),
    lower(TG_OP) || ':' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    _record_id,
    TG_ARGV[0],
    jsonb_build_object(
      'op', TG_OP,
      'old', CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN _old_data ELSE NULL END,
      'new', CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN _new_data ELSE NULL END
    ),
    now()
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- Attach audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_tenants ON public.tenants;
CREATE TRIGGER audit_tenants AFTER INSERT OR UPDATE OR DELETE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn('property_management');

DROP TRIGGER IF EXISTS audit_leases ON public.leases;
CREATE TRIGGER audit_leases AFTER INSERT OR UPDATE OR DELETE ON public.leases
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn('property_management');

DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn('security');

DROP TRIGGER IF EXISTS audit_org_members ON public.org_members;
CREATE TRIGGER audit_org_members AFTER INSERT OR UPDATE OR DELETE ON public.org_members
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn('security');

DROP TRIGGER IF EXISTS audit_wallet_transactions ON public.wallet_transactions;
CREATE TRIGGER audit_wallet_transactions AFTER INSERT OR UPDATE OR DELETE ON public.wallet_transactions
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn('fintech');

DROP TRIGGER IF EXISTS audit_owner_profiles ON public.owner_profiles;
CREATE TRIGGER audit_owner_profiles AFTER INSERT OR UPDATE OR DELETE ON public.owner_profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn('property_management');

-- =================== RPC GATEWAY: SAFE TENANT READ ===================

CREATE OR REPLACE FUNCTION public.get_safe_tenants(_org_id uuid)
RETURNS TABLE(
  id uuid, org_id uuid, first_name text, last_name text,
  email text, phone text, status text, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _caller uuid := auth.uid();
  _can_see_pii boolean;
BEGIN
  -- Verify caller is org member
  IF NOT EXISTS (SELECT 1 FROM public.org_members WHERE user_id = _caller AND org_id = _org_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  _can_see_pii := public.can_view_sensitive_pii(_caller, _org_id);

  RETURN QUERY
  SELECT t.id, t.org_id, t.first_name, t.last_name,
    CASE WHEN _can_see_pii THEN t.email ELSE public.mask_email(t.email) END,
    CASE WHEN _can_see_pii THEN t.phone ELSE public.mask_phone(t.phone) END,
    t.status, t.created_at
  FROM public.tenants t
  WHERE t.org_id = _org_id
  ORDER BY t.last_name, t.first_name;
END;
$$;

-- =================== RPC GATEWAY: SAFE ORG READ ===================

CREATE OR REPLACE FUNCTION public.get_safe_org(_org_id uuid)
RETURNS TABLE(
  id uuid, name text, email text, phone text, 
  bank_iban text, bank_bic text, bank_holder_name text,
  stripe_account_id text, country text, city text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _caller uuid := auth.uid();
  _role text;
BEGIN
  SELECT om.role::text INTO _role FROM public.org_members om
  WHERE om.user_id = _caller AND om.org_id = _org_id;
  
  IF _role IS NULL THEN RAISE EXCEPTION 'Access denied'; END IF;

  RETURN QUERY
  SELECT o.id, o.name,
    CASE WHEN _role IN ('owner','admin') THEN o.email ELSE public.mask_email(o.email) END,
    CASE WHEN _role IN ('owner','admin') THEN o.phone ELSE public.mask_phone(o.phone) END,
    CASE WHEN _role IN ('owner','admin') THEN o.bank_iban ELSE public.mask_iban(o.bank_iban) END,
    CASE WHEN _role IN ('owner','admin') THEN o.bank_bic ELSE NULL END,
    CASE WHEN _role IN ('owner','admin') THEN o.bank_holder_name ELSE NULL END,
    CASE WHEN _role = 'owner' THEN o.stripe_account_id ELSE NULL END,
    o.country, o.city
  FROM public.orgs o WHERE o.id = _org_id;
END;
$$;

-- =================== RPC GATEWAY: SAFE OWNER PROFILE ===================

CREATE OR REPLACE FUNCTION public.get_safe_owner_profile(_profile_user_id uuid)
RETURNS TABLE(
  id uuid, user_id uuid, first_name text, last_name text, 
  email text, phone text, bank_iban text, tax_id text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  -- Only self or admin can read
  IF _caller != _profile_user_id AND NOT public.is_admin(_caller) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT op.id, op.user_id, op.first_name, op.last_name,
    CASE WHEN _caller = _profile_user_id THEN op.email ELSE public.mask_email(op.email) END,
    CASE WHEN _caller = _profile_user_id THEN op.phone ELSE public.mask_phone(op.phone) END,
    CASE WHEN _caller = _profile_user_id THEN op.bank_iban ELSE public.mask_iban(op.bank_iban) END,
    CASE WHEN _caller = _profile_user_id THEN op.tax_id ELSE NULL END
  FROM public.owner_profiles op WHERE op.user_id = _profile_user_id;
END;
$$;

-- =================== RPC GATEWAY: WALLET SUMMARY ===================

CREATE OR REPLACE FUNCTION public.get_wallet_summary()
RETURNS TABLE(
  wallet_id uuid, available numeric, escrow numeric, pending numeric, currency text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  RETURN QUERY
  SELECT wb.id, wb.available, wb.escrow, wb.pending, wb.currency
  FROM public.wallet_balances_v2 wb
  WHERE wb.user_id = _caller;
END;
$$;
