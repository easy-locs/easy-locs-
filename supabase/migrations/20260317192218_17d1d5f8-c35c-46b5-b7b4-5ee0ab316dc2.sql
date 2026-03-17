
-- Unified wallet_transactions table for the super-app payment system
create table if not exists public.unified_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sender_id uuid null references auth.users(id) on delete set null,
  recipient_id uuid null references auth.users(id) on delete set null,
  amount numeric(12,2) not null,
  currency text not null default 'AED',
  context_type text not null default 'generic',
  context_id text null,
  title text null,
  subtitle text null,
  status text not null default 'completed',
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_unified_wallet_tx_sender on public.unified_wallet_transactions(sender_id);
create index if not exists idx_unified_wallet_tx_recipient on public.unified_wallet_transactions(recipient_id);
create index if not exists idx_unified_wallet_tx_context on public.unified_wallet_transactions(context_type, context_id);
create index if not exists idx_unified_wallet_tx_created on public.unified_wallet_transactions(created_at desc);

-- Auto-update updated_at
create or replace function public.set_unified_wallet_tx_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_unified_wallet_tx_updated_at
before update on public.unified_wallet_transactions
for each row execute function public.set_unified_wallet_tx_updated_at();

-- RLS
alter table public.unified_wallet_transactions enable row level security;

create policy "unified_wallet_tx_select_own"
on public.unified_wallet_transactions for select to authenticated
using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "unified_wallet_tx_insert_own"
on public.unified_wallet_transactions for insert to authenticated
with check (auth.uid() = sender_id);

create policy "unified_wallet_tx_update_own"
on public.unified_wallet_transactions for update to authenticated
using (auth.uid() = sender_id or auth.uid() = recipient_id)
with check (auth.uid() = sender_id or auth.uid() = recipient_id);
