
-- PHASE 2.2 PART 2A — BACKFILL ONLY

-- profiles → user_private_data
insert into public.user_private_data (user_id, email, phone)
select p.id, p.email, p.phone
from public.profiles p
where p.id is not null
on conflict (user_id) do update set
  email = excluded.email, phone = excluded.phone, updated_at = now();

-- owner_profiles → owner_private_financials (deduplicated)
insert into public.owner_private_financials (user_id, iban, bic, bank_holder_name, tax_id)
select distinct on (op.user_id) op.user_id, op.bank_iban, op.bank_bic, op.bank_name, op.tax_id
from public.owner_profiles op
where op.user_id is not null
order by op.user_id, op.created_at desc
on conflict (user_id) do update set
  iban = excluded.iban, bic = excluded.bic,
  bank_holder_name = excluded.bank_holder_name, tax_id = excluded.tax_id, updated_at = now();

-- tenants → tenant_private_contacts
insert into public.tenant_private_contacts (tenant_id, email, phone)
select t.id, t.email, t.phone
from public.tenants t
where t.id is not null
on conflict (tenant_id) do update set
  email = excluded.email, phone = excluded.phone, updated_at = now();

-- auto_discovered_merchants → merchant_private_contacts (deduplicated)
insert into public.merchant_private_contacts (merchant_id, email, phone)
select distinct on (adm.id) adm.id, adm.email, adm.phone
from public.auto_discovered_merchants adm
where adm.id is not null and (adm.email is not null or adm.phone is not null)
on conflict (merchant_id) do update set
  email = excluded.email, phone = excluded.phone, updated_at = now();
