
-- payment_events table
create table if not exists public.payment_events (
  id text primary key,
  provider text not null default 'stripe',
  event_type text not null,
  external_id text not null,
  processed boolean not null default false,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_payment_events_external_id
  on public.payment_events(external_id);

alter table public.payment_events enable row level security;

create policy "admins read payment events"
on public.payment_events
for select
using (
  exists (
    select 1
    from public.orbit_profiles_v2 op
    where op.id = auth.uid()
      and op.role = 'admin'
  )
);

-- Storage buckets
insert into storage.buckets (id, name, public)
values
  ('property-media', 'property-media', true),
  ('lease-documents', 'lease-documents', false),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage RLS policies
create policy "public read property media"
on storage.objects for select
using (bucket_id = 'property-media');

create policy "authenticated upload property media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'property-media');

create policy "public read avatars"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "authenticated upload avatars"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars');

create policy "authenticated read lease docs"
on storage.objects for select
to authenticated
using (bucket_id = 'lease-documents');

create policy "authenticated upload lease docs"
on storage.objects for insert
to authenticated
with check (bucket_id = 'lease-documents');
