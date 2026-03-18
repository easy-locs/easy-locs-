
create table if not exists public.fraud_entities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  risk_score numeric default 0,
  risk_band text default 'low',
  status text default 'active',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_fraud_entities_type_id on public.fraud_entities(entity_type, entity_id);

create table if not exists public.fraud_edges (
  id uuid primary key default gen_random_uuid(),
  from_entity_id uuid not null references public.fraud_entities(id) on delete cascade,
  to_entity_id uuid not null references public.fraud_entities(id) on delete cascade,
  edge_type text not null,
  weight numeric default 1,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_fraud_edges_from on public.fraud_edges(from_entity_id);

create table if not exists public.device_fingerprints (
  id uuid primary key default gen_random_uuid(),
  fingerprint_hash text not null,
  user_id uuid,
  ip_address text,
  user_agent text,
  device_type text,
  risk_score numeric default 0,
  created_at timestamptz default now()
);

create index if not exists idx_device_fingerprint_hash on public.device_fingerprints(fingerprint_hash);

alter table public.fraud_entities enable row level security;
alter table public.fraud_edges enable row level security;
alter table public.device_fingerprints enable row level security;

create policy "fraud_entities_select_auth" on public.fraud_entities for select to authenticated using (true);
create policy "fraud_entities_insert_auth" on public.fraud_entities for insert to authenticated with check (true);
create policy "fraud_entities_update_auth" on public.fraud_entities for update to authenticated using (true) with check (true);

create policy "fraud_edges_select_auth" on public.fraud_edges for select to authenticated using (true);
create policy "fraud_edges_insert_auth" on public.fraud_edges for insert to authenticated with check (true);

create policy "device_fingerprints_select_auth" on public.device_fingerprints for select to authenticated using (true);
create policy "device_fingerprints_insert_auth" on public.device_fingerprints for insert to authenticated with check (true);

drop trigger if exists trg_fraud_entities_updated_at on public.fraud_entities;
create trigger trg_fraud_entities_updated_at
before update on public.fraud_entities
for each row execute function public.handle_updated_at();
