create table if not exists public.short_links (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  expires_at timestamptz,
  click_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_short_links_code on public.short_links (code);
create index if not exists idx_short_links_created_by on public.short_links (created_by);
create index if not exists idx_short_links_action on public.short_links (action);

alter table public.short_links enable row level security;

create policy "Creators can read their own short links"
  on public.short_links for select
  to authenticated
  using (auth.uid() = created_by);

create policy "Authenticated users can create short links"
  on public.short_links for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Creators can update their short links"
  on public.short_links for update
  to authenticated
  using (auth.uid() = created_by);

create or replace function public.resolve_short_link(p_code text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_link record;
begin
  select * into v_link
  from public.short_links
  where code = p_code
  and (expires_at is null or expires_at > now());

  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;

  update public.short_links
  set click_count = click_count + 1
  where id = v_link.id;

  return jsonb_build_object(
    'action', v_link.action,
    'payload', v_link.payload
  );
end;
$$;
