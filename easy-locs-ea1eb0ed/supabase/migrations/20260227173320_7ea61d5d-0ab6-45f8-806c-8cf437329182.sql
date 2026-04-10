
-- Step 1: Deduplicate rent_calls - keep only the most recent (or paid) record per org/tenant/month
DELETE FROM public.rent_calls
WHERE id NOT IN (
  SELECT DISTINCT ON (org_id, tenant_id, month) id
  FROM public.rent_calls
  ORDER BY org_id, tenant_id, month, paid DESC NULLS LAST, created_at DESC
);

-- Step 2: Add unique constraint to prevent future duplicates
ALTER TABLE public.rent_calls
ADD CONSTRAINT rent_calls_org_tenant_month_unique UNIQUE (org_id, tenant_id, month);

-- Step 3: Same for payment_notices
DELETE FROM public.payment_notices
WHERE id NOT IN (
  SELECT DISTINCT ON (org_id, tenant_id, month) id
  FROM public.payment_notices
  ORDER BY org_id, tenant_id, month, created_at DESC
);

ALTER TABLE public.payment_notices
ADD CONSTRAINT payment_notices_org_tenant_month_unique UNIQUE (org_id, tenant_id, month);
