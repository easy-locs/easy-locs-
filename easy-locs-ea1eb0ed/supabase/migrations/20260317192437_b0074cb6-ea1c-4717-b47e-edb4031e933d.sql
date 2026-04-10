
-- WALLET BALANCES
create table if not exists public.wallet_balances_v2 (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(12,2) not null default 0,
  currency text not null default 'AED',
  updated_at timestamptz not null default now()
);

create or replace function public.set_wallet_balances_v2_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_wallet_balances_v2_updated_at on public.wallet_balances_v2;
create trigger trg_wallet_balances_v2_updated_at
before update on public.wallet_balances_v2
for each row execute function public.set_wallet_balances_v2_updated_at();

-- ATOMIC TRANSFER FUNCTION
create or replace function public.wallet_transfer(
  p_sender uuid,
  p_recipient uuid,
  p_amount numeric,
  p_currency text,
  p_context_type text,
  p_context_id text,
  p_title text,
  p_subtitle text,
  p_metadata jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx_id uuid;
  v_sender_balance numeric;
begin
  if p_amount <= 0 then
    raise exception 'Invalid amount';
  end if;

  -- ensure balance rows exist
  insert into public.wallet_balances_v2 (user_id)
  values (p_sender)
  on conflict (user_id) do nothing;

  insert into public.wallet_balances_v2 (user_id)
  values (p_recipient)
  on conflict (user_id) do nothing;

  -- lock sender row
  select balance into v_sender_balance
  from public.wallet_balances_v2
  where user_id = p_sender
  for update;

  if v_sender_balance < p_amount then
    raise exception 'Insufficient funds';
  end if;

  -- debit / credit
  update public.wallet_balances_v2
  set balance = balance - p_amount
  where user_id = p_sender;

  update public.wallet_balances_v2
  set balance = balance + p_amount
  where user_id = p_recipient;

  -- record transaction
  insert into public.unified_wallet_transactions (
    sender_id, recipient_id, amount, currency,
    context_type, context_id, title, subtitle, status, metadata
  )
  values (
    p_sender, p_recipient, p_amount, coalesce(p_currency,'AED'),
    coalesce(p_context_type,'generic'), p_context_id,
    p_title, p_subtitle, 'completed', coalesce(p_metadata,'{}'::jsonb)
  )
  returning id into v_tx_id;

  return v_tx_id;
end;
$$;

-- RLS on wallet_balances_v2
alter table public.wallet_balances_v2 enable row level security;

drop policy if exists "balance_v2_select_own" on public.wallet_balances_v2;
create policy "balance_v2_select_own"
on public.wallet_balances_v2
for select to authenticated
using (auth.uid() = user_id);

-- Enable realtime for wallet_balances_v2
alter publication supabase_realtime add table public.wallet_balances_v2;
