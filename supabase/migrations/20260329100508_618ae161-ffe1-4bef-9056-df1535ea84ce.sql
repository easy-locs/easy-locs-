
-- PHASE 2.2 PART 1 — TABLES + RLS + POLICIES + TRIGGERS

-- 1. PII ISOLATION TABLES
create table if not exists public.user_private_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  email text, phone text,
  extra_sensitive_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.owner_private_financials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  iban text, bic text, bank_holder_name text, tax_id text,
  extra_financial_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.tenant_private_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique,
  email text, phone text, emergency_contact text,
  extra_private_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.merchant_private_contacts (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null unique,
  email text, phone text,
  extra_private_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_private_data_user_id on public.user_private_data(user_id);
create index if not exists idx_owner_private_financials_user_id on public.owner_private_financials(user_id);
create index if not exists idx_tenant_private_contacts_tenant_id on public.tenant_private_contacts(tenant_id);
create index if not exists idx_merchant_private_contacts_merchant_id on public.merchant_private_contacts(merchant_id);

-- Updated_at triggers
drop trigger if exists trg_user_private_data_updated_at on public.user_private_data;
create trigger trg_user_private_data_updated_at before update on public.user_private_data for each row execute function public.set_updated_at();
drop trigger if exists trg_owner_private_financials_updated_at on public.owner_private_financials;
create trigger trg_owner_private_financials_updated_at before update on public.owner_private_financials for each row execute function public.set_updated_at();
drop trigger if exists trg_tenant_private_contacts_updated_at on public.tenant_private_contacts;
create trigger trg_tenant_private_contacts_updated_at before update on public.tenant_private_contacts for each row execute function public.set_updated_at();
drop trigger if exists trg_merchant_private_contacts_updated_at on public.merchant_private_contacts;
create trigger trg_merchant_private_contacts_updated_at before update on public.merchant_private_contacts for each row execute function public.set_updated_at();

-- RLS
alter table public.user_private_data enable row level security;
alter table public.owner_private_financials enable row level security;
alter table public.tenant_private_contacts enable row level security;
alter table public.merchant_private_contacts enable row level security;

-- POLICIES — user_private_data (CRUD)
drop policy if exists "user_private_data_self_select" on public.user_private_data;
create policy "user_private_data_self_select" on public.user_private_data for select to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists "user_private_data_self_insert" on public.user_private_data;
create policy "user_private_data_self_insert" on public.user_private_data for insert to authenticated with check (user_id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists "user_private_data_self_update" on public.user_private_data;
create policy "user_private_data_self_update" on public.user_private_data for update to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid())) with check (user_id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists "user_private_data_admin_delete" on public.user_private_data;
create policy "user_private_data_admin_delete" on public.user_private_data for delete to authenticated using (public.is_admin(auth.uid()));

-- POLICIES — owner_private_financials
drop policy if exists "owner_private_financials_self_select" on public.owner_private_financials;
create policy "owner_private_financials_self_select" on public.owner_private_financials for select to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists "owner_private_financials_self_insert" on public.owner_private_financials;
create policy "owner_private_financials_self_insert" on public.owner_private_financials for insert to authenticated with check (user_id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists "owner_private_financials_self_update" on public.owner_private_financials;
create policy "owner_private_financials_self_update" on public.owner_private_financials for update to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid())) with check (user_id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists "owner_private_financials_admin_delete" on public.owner_private_financials;
create policy "owner_private_financials_admin_delete" on public.owner_private_financials for delete to authenticated using (public.is_admin(auth.uid()));

-- POLICIES — tenant_private_contacts
drop policy if exists "tenant_private_contacts_org_select" on public.tenant_private_contacts;
create policy "tenant_private_contacts_org_select" on public.tenant_private_contacts for select to authenticated using (public.is_admin(auth.uid()) or exists (select 1 from public.tenants t join public.org_members om on om.org_id = t.org_id where t.id = tenant_private_contacts.tenant_id and om.user_id = auth.uid()));
drop policy if exists "tenant_private_contacts_org_insert" on public.tenant_private_contacts;
create policy "tenant_private_contacts_org_insert" on public.tenant_private_contacts for insert to authenticated with check (public.is_admin(auth.uid()) or exists (select 1 from public.tenants t join public.org_members om on om.org_id = t.org_id where t.id = tenant_private_contacts.tenant_id and om.user_id = auth.uid()));
drop policy if exists "tenant_private_contacts_org_update" on public.tenant_private_contacts;
create policy "tenant_private_contacts_org_update" on public.tenant_private_contacts for update to authenticated using (public.is_admin(auth.uid()) or exists (select 1 from public.tenants t join public.org_members om on om.org_id = t.org_id where t.id = tenant_private_contacts.tenant_id and om.user_id = auth.uid())) with check (public.is_admin(auth.uid()) or exists (select 1 from public.tenants t join public.org_members om on om.org_id = t.org_id where t.id = tenant_private_contacts.tenant_id and om.user_id = auth.uid()));
drop policy if exists "tenant_private_contacts_admin_delete" on public.tenant_private_contacts;
create policy "tenant_private_contacts_admin_delete" on public.tenant_private_contacts for delete to authenticated using (public.is_admin(auth.uid()));

-- POLICIES — merchant_private_contacts (admin only)
drop policy if exists "merchant_private_contacts_admin_select" on public.merchant_private_contacts;
create policy "merchant_private_contacts_admin_select" on public.merchant_private_contacts for select to authenticated using (public.is_admin(auth.uid()));
drop policy if exists "merchant_private_contacts_admin_insert" on public.merchant_private_contacts;
create policy "merchant_private_contacts_admin_insert" on public.merchant_private_contacts for insert to authenticated with check (public.is_admin(auth.uid()));
drop policy if exists "merchant_private_contacts_admin_update" on public.merchant_private_contacts;
create policy "merchant_private_contacts_admin_update" on public.merchant_private_contacts for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
drop policy if exists "merchant_private_contacts_admin_delete" on public.merchant_private_contacts;
create policy "merchant_private_contacts_admin_delete" on public.merchant_private_contacts for delete to authenticated using (public.is_admin(auth.uid()));

-- AUDIT TRIGGERS on PII tables
drop trigger if exists audit_user_private_data on public.user_private_data;
create trigger audit_user_private_data after insert or update or delete on public.user_private_data for each row execute function public.audit_trigger_fn('pii');
drop trigger if exists audit_owner_private_financials on public.owner_private_financials;
create trigger audit_owner_private_financials after insert or update or delete on public.owner_private_financials for each row execute function public.audit_trigger_fn('fintech');
drop trigger if exists audit_tenant_private_contacts on public.tenant_private_contacts;
create trigger audit_tenant_private_contacts after insert or update or delete on public.tenant_private_contacts for each row execute function public.audit_trigger_fn('pii');
drop trigger if exists audit_merchant_private_contacts on public.merchant_private_contacts;
create trigger audit_merchant_private_contacts after insert or update or delete on public.merchant_private_contacts for each row execute function public.audit_trigger_fn('pii');

-- Audit on wallet_ledger_entries
drop trigger if exists audit_wallet_ledger_entries on public.wallet_ledger_entries;
create trigger audit_wallet_ledger_entries after insert or update or delete on public.wallet_ledger_entries for each row execute function public.audit_trigger_fn('fintech');
