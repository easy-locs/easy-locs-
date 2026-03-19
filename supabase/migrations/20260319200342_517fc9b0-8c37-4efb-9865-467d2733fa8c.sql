
create table if not exists public.dino_page_audits (
  id uuid primary key default gen_random_uuid(),
  route text not null,
  page_key text,
  actor_type text not null default 'anonymous',
  actor_id text,
  country text,
  language text,
  audit_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.dino_media_rules (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null,
  width integer not null,
  height integer not null,
  crop text not null default 'fill',
  quality text not null default 'auto',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.dino_route_registry (
  id uuid primary key default gen_random_uuid(),
  route text not null unique,
  page_key text not null,
  service_key text,
  active boolean not null default true,
  requires_auth boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_dino_page_audits_route on public.dino_page_audits(route);
create index if not exists idx_dino_route_registry_active on public.dino_route_registry(active);

alter table public.dino_page_audits enable row level security;
alter table public.dino_media_rules enable row level security;
alter table public.dino_route_registry enable row level security;

create policy "Service role full access on dino_page_audits" on public.dino_page_audits for all using (true) with check (true);
create policy "Service role full access on dino_media_rules" on public.dino_media_rules for all using (true) with check (true);
create policy "Service role full access on dino_route_registry" on public.dino_route_registry for all using (true) with check (true);
