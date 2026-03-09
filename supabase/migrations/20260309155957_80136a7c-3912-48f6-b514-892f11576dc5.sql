-- Secure RPC for tenants to get owner bank info for SEPA payments only
CREATE OR REPLACE FUNCTION public.get_owner_bank_for_tenant(_org_id uuid)
RETURNS TABLE(
  full_name text,
  bank_iban text,
  bank_bic text,
  bank_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    op.full_name,
    op.bank_iban,
    op.bank_bic,
    op.bank_name
  FROM owner_profiles op
  WHERE op.org_id = _org_id
  AND EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.org_id = _org_id
    AND t.tenant_user_id = auth.uid()
  )
  LIMIT 1;
$$;