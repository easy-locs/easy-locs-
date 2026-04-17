-- ============================================================================
-- #946 — Audit Big Tech / Admin access
-- Idempotent migration that:
--   1. Adds 'super_admin' to the public.app_role enum if it does not yet exist.
--   2. Re-asserts that the public.has_role(uuid, app_role) RPC exists with the
--      expected signature (so SuperAdminGate's RPC call can never 404).
--   3. Provides an admin_allowlist table (RLS-protected) as a future server-side
--      source of truth that mirrors VITE_ADMIN_ALLOWLIST. The frontend still
--      reads VITE_ADMIN_ALLOWLIST today, but having the table in place lets us
--      switch sources without another migration.
--   4. Best-effort grant of the 'super_admin' role to the well-known owner
--      account (habboujabir@gmail.com) so the audit acceptance criteria are
--      met out of the box. Safe no-op if the auth user does not exist yet.
-- ============================================================================

-- 1. Enum value (Postgres requires this outside a transaction block when
--    adding to an enum on some versions; the IF NOT EXISTS guard makes it
--    safe to re-run).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'app_role'
      AND e.enumlabel = 'super_admin'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'super_admin';
  END IF;
END$$;

-- 2. Re-assert has_role RPC. CREATE OR REPLACE so reruns are safe.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

-- 3. admin_allowlist table — server-side mirror of VITE_ADMIN_ALLOWLIST.
CREATE TABLE IF NOT EXISTS public.admin_allowlist (
  email      TEXT PRIMARY KEY,
  added_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  note       TEXT
);

ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;

-- Only super_admin / owner can read or modify the allowlist.
DROP POLICY IF EXISTS "admin_allowlist_select" ON public.admin_allowlist;
CREATE POLICY "admin_allowlist_select" ON public.admin_allowlist
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'owner'::public.app_role)
  );

DROP POLICY IF EXISTS "admin_allowlist_modify" ON public.admin_allowlist;
CREATE POLICY "admin_allowlist_modify" ON public.admin_allowlist
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- Seed the well-known owner email if not already present.
INSERT INTO public.admin_allowlist (email, note)
VALUES ('habboujabir@gmail.com', 'Project owner — seeded by migration #946')
ON CONFLICT (email) DO NOTHING;

-- 4. Grant super_admin role to the well-known owner account if it exists.
--    Uses a DO block with a separate transaction note so the migration does
--    not fail if the auth.users row has not been created yet.
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id
    INTO v_user_id
    FROM auth.users
   WHERE lower(email) = 'habboujabir@gmail.com'
   LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'super_admin'::public.app_role)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin'::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    -- public.user_roles missing in some environments; ignore.
    NULL;
  WHEN unique_violation THEN
    NULL;
END$$;
