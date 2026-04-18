-- Task #1004 — Hardening: idempotency keys store.
--
-- A single, append-only table that backs the unified idempotency layer in
-- src/lib/idempotency and supabase/functions/_shared/idempotency.ts.
--
-- Contract:
--   namespace + key form a unique pair. The first insert wins.
--   Subsequent attempts to claim the same (namespace, key) within the TTL
--   return the previously stored result so callers can short-circuit any
--   side effect (notification send, ledger write, agent spawn, etc.).
--
-- TTL is enforced lazily: rows older than expires_at are deleted by the
-- claim function before checking, so replays after TTL behave as fresh
-- requests (matching at-least-once delivery semantics for upstream
-- providers).

create table if not exists public.idempotency_keys (
  namespace text not null,
  key text not null,
  payload_hash text,
  result_json jsonb,
  status text not null default 'pending' check (status in ('pending','succeeded','failed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (namespace, key)
);

create index if not exists idempotency_keys_expires_idx
  on public.idempotency_keys (expires_at);

alter table public.idempotency_keys enable row level security;

-- Service role only. No client should read/write directly; everything
-- goes through claim_idempotency_key / finalize_idempotency_key.
drop policy if exists "service role full access" on public.idempotency_keys;
create policy "service role full access"
  on public.idempotency_keys
  for all
  to service_role
  using (true)
  with check (true);

-- Atomic claim. Returns the existing row if a non-expired one is present,
-- otherwise inserts a fresh pending row and returns it. Callers compare
-- the returned status to decide whether to execute the side effect.
create or replace function public.claim_idempotency_key(
  p_namespace text,
  p_key text,
  p_payload_hash text,
  p_ttl_seconds int default 86400
)
returns table (
  is_new boolean,
  status text,
  result_json jsonb,
  payload_hash text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_expires timestamptz := v_now + make_interval(secs => p_ttl_seconds);
  v_existing public.idempotency_keys%rowtype;
begin
  delete from public.idempotency_keys
   where namespace = p_namespace
     and key = p_key
     and expires_at < v_now;

  insert into public.idempotency_keys (namespace, key, payload_hash, status, created_at, expires_at)
  values (p_namespace, p_key, p_payload_hash, 'pending', v_now, v_expires)
  on conflict (namespace, key) do nothing;

  select * into v_existing
    from public.idempotency_keys
   where namespace = p_namespace and key = p_key;

  return query select
    (v_existing.created_at = v_now) as is_new,
    v_existing.status,
    v_existing.result_json,
    v_existing.payload_hash;
end;
$$;

revoke all on function public.claim_idempotency_key(text, text, text, int) from public;
grant execute on function public.claim_idempotency_key(text, text, text, int) to service_role;

create or replace function public.finalize_idempotency_key(
  p_namespace text,
  p_key text,
  p_status text,
  p_result_json jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.idempotency_keys
     set status = p_status,
         result_json = p_result_json
   where namespace = p_namespace and key = p_key;
$$;

revoke all on function public.finalize_idempotency_key(text, text, text, jsonb) from public;
grant execute on function public.finalize_idempotency_key(text, text, text, jsonb) to service_role;
