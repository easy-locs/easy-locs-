
-- PHASE 2.2 PART 2B — FUNCTIONS + SAFE VIEW

-- Wallet ledger summary (correct column: owner_user_id)
create or replace function public.get_wallet_ledger_summary(_user_id uuid default auth.uid())
returns table (user_id uuid, available numeric, pending numeric, escrow numeric, currency text)
language sql stable security definer set search_path = public
as $$
  select
    _user_id as user_id,
    coalesce(sum(case
      when wle.direction = 'credit' and wle.status = 'posted' then wle.amount
      when wle.direction = 'debit' and wle.status = 'posted' then -wle.amount
      else 0 end), 0)::numeric as available,
    coalesce(sum(case when wle.status = 'pending' then wle.amount else 0 end), 0)::numeric as pending,
    coalesce(sum(case
      when wle.entry_type = 'escrow_lock' and wle.status = 'posted' then wle.amount
      when wle.entry_type = 'escrow_release' and wle.status = 'posted' then -wle.amount
      else 0 end), 0)::numeric as escrow,
    coalesce(max(wle.currency), 'XOF')::text as currency
  from public.wallet_ledger_entries wle
  join public.wallet_accounts wa on wa.id = wle.wallet_account_id
  where wa.owner_user_id = _user_id
$$;

-- Safe owner view
drop view if exists public.owner_profiles_safe;
create view public.owner_profiles_safe as
select op.id, op.user_id, op.full_name, op.company_name, op.city, op.country,
  public.mask_email(upd.email) as email,
  public.mask_phone(upd.phone) as phone,
  public.mask_iban(opf.iban) as bank_iban
from public.owner_profiles op
left join public.user_private_data upd on upd.user_id = op.user_id
left join public.owner_private_financials opf on opf.user_id = op.user_id;

-- Safe tenant contact RPC
create or replace function public.get_safe_tenant_contact(_tenant_id uuid)
returns table (tenant_id uuid, email text, phone text, emergency_contact text)
language plpgsql stable security definer set search_path = public
as $$
declare _caller uuid := auth.uid();
begin
  if _caller is null then raise exception 'Not authenticated'; end if;
  if not (public.is_admin(_caller) or exists (
    select 1 from public.tenants t join public.org_members om on om.org_id = t.org_id
    where t.id = _tenant_id and om.user_id = _caller
  )) then raise exception 'Access denied'; end if;
  return query select tpc.tenant_id, tpc.email, tpc.phone, tpc.emergency_contact
  from public.tenant_private_contacts tpc where tpc.tenant_id = _tenant_id;
end;
$$;

-- Safe owner financials RPC
create or replace function public.get_safe_owner_financials(_user_id uuid)
returns table (user_id uuid, iban text, bic text, bank_holder_name text, tax_id text)
language plpgsql stable security definer set search_path = public
as $$
declare _caller uuid := auth.uid();
begin
  if _caller is null then raise exception 'Not authenticated'; end if;
  if not (_caller = _user_id or public.is_admin(_caller)) then raise exception 'Access denied'; end if;
  return query select opf.user_id, opf.iban, opf.bic, opf.bank_holder_name, opf.tax_id
  from public.owner_private_financials opf where opf.user_id = _user_id;
end;
$$;
