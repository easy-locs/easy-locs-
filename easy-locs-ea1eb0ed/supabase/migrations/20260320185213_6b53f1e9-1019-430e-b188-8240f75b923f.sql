
/* Enable RLS */
alter table if exists public.wallet_accounts enable row level security;
alter table if exists public.wallet_ledger_entries enable row level security;
alter table if exists public.payment_requests enable row level security;
alter table if exists public.refund_requests enable row level security;
alter table if exists public.user_trust_graph enable row level security;
alter table if exists public.storefront_refund_policies enable row level security;
alter table if exists public.call_transcripts enable row level security;
alter table if exists public.call_signals enable row level security;
alter table if exists public.ai_chat_messages enable row level security;
alter table if exists public.device_fingerprints enable row level security;
alter table if exists public.merchant_onboarding_profiles enable row level security;
alter table if exists public.sales_ai_leads enable row level security;
alter table if exists public.admin_alerts enable row level security;
alter table if exists public.security_nonces enable row level security;
alter table if exists public.workspace_members enable row level security;

/* Drop dangerous USING(true) policies */
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual,'') = 'true' or coalesce(with_check,'') = 'true')
      and policyname not in ('authenticated can lookup orbit profiles','storefront_refund_policies_public_read')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

/* wallet_accounts */
drop policy if exists "wallet_accounts_owner_only" on public.wallet_accounts;
create policy "wallet_accounts_owner_only" on public.wallet_accounts for all to authenticated
using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

/* wallet_ledger_entries */
drop policy if exists "wallet_ledger_entries_owner_only" on public.wallet_ledger_entries;
create policy "wallet_ledger_entries_owner_only" on public.wallet_ledger_entries for select to authenticated
using (exists (select 1 from public.wallet_accounts wa where wa.id = wallet_account_id and wa.owner_user_id = auth.uid()));

/* payment_requests */
drop policy if exists "payment_requests_participant_only" on public.payment_requests;
create policy "payment_requests_participant_only" on public.payment_requests for all to authenticated
using (sender_id = auth.uid() or requester_id = auth.uid() or recipient_id = auth.uid())
with check (sender_id = auth.uid() or requester_id = auth.uid());

/* refund_requests */
drop policy if exists "refund_requests_owner_only" on public.refund_requests;
create policy "refund_requests_owner_only" on public.refund_requests for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

/* user_trust_graph */
drop policy if exists "user_trust_graph_owner_only" on public.user_trust_graph;
create policy "user_trust_graph_owner_only" on public.user_trust_graph for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

/* storefront_refund_policies (shop_id -> storefront_pages.user_id) */
drop policy if exists "storefront_refund_policies_public_read" on public.storefront_refund_policies;
create policy "storefront_refund_policies_public_read" on public.storefront_refund_policies for select to authenticated using (true);

drop policy if exists "storefront_refund_policies_owner_manage" on public.storefront_refund_policies;
create policy "storefront_refund_policies_owner_manage" on public.storefront_refund_policies for insert to authenticated
with check (exists (select 1 from public.storefront_pages sp where sp.id = shop_id and sp.user_id = auth.uid()));

drop policy if exists "storefront_refund_policies_owner_update" on public.storefront_refund_policies;
create policy "storefront_refund_policies_owner_update" on public.storefront_refund_policies for update to authenticated
using (exists (select 1 from public.storefront_pages sp where sp.id = shop_id and sp.user_id = auth.uid()))
with check (exists (select 1 from public.storefront_pages sp where sp.id = shop_id and sp.user_id = auth.uid()));

drop policy if exists "storefront_refund_policies_owner_delete" on public.storefront_refund_policies;
create policy "storefront_refund_policies_owner_delete" on public.storefront_refund_policies for delete to authenticated
using (exists (select 1 from public.storefront_pages sp where sp.id = shop_id and sp.user_id = auth.uid()));

/* call_transcripts */
drop policy if exists "call_transcripts_participants_only" on public.call_transcripts;
create policy "call_transcripts_participants_only" on public.call_transcripts for select to authenticated
using (exists (
  select 1 from public.call_sessions cs join public.orbit_profiles_v2 op on op.id = auth.uid()
  where cs.id = call_transcripts.call_session_id
    and (cs.caller_orbit_id = op.orbit_id or cs.receiver_orbit_id = op.orbit_id)
));

/* call_signals */
drop policy if exists "call_signals_participants_only" on public.call_signals;
create policy "call_signals_participants_only" on public.call_signals for select to authenticated
using (exists (
  select 1 from public.call_sessions cs join public.orbit_profiles_v2 op on op.id = auth.uid()
  where cs.id::text = call_signals.session_id
    and (cs.caller_orbit_id = op.orbit_id or cs.receiver_orbit_id = op.orbit_id)
));

drop policy if exists "call_signals_sender_only_insert" on public.call_signals;
create policy "call_signals_sender_only_insert" on public.call_signals for insert to authenticated
with check (exists (select 1 from public.orbit_profiles_v2 op where op.id = auth.uid() and op.orbit_id = sender_orbit_id));

/* ai_chat_messages (created_by is uuid) */
drop policy if exists "ai_chat_messages_creator_only" on public.ai_chat_messages;
create policy "ai_chat_messages_creator_only" on public.ai_chat_messages for all to authenticated
using (exists (select 1 from public.ai_chat_threads t where t.id = thread_id and t.created_by = auth.uid()))
with check (exists (select 1 from public.ai_chat_threads t where t.id = thread_id and t.created_by = auth.uid()));

/* device_fingerprints */
drop policy if exists "device_fingerprints_owner_only" on public.device_fingerprints;
create policy "device_fingerprints_owner_only" on public.device_fingerprints for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

/* merchant_onboarding_profiles (workspace scope) */
drop policy if exists "merchant_onboarding_profiles_workspace_scope" on public.merchant_onboarding_profiles;
create policy "merchant_onboarding_profiles_workspace_scope" on public.merchant_onboarding_profiles for all to authenticated
using (exists (select 1 from public.workspace_members wm where wm.workspace_id = merchant_onboarding_profiles.workspace_id and wm.user_id = auth.uid()))
with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = merchant_onboarding_profiles.workspace_id and wm.user_id = auth.uid()));

/* sales_ai_leads */
drop policy if exists "sales_ai_leads_workspace_scope" on public.sales_ai_leads;
create policy "sales_ai_leads_workspace_scope" on public.sales_ai_leads for all to authenticated
using (exists (select 1 from public.workspace_members wm where wm.workspace_id = sales_ai_leads.workspace_id and wm.user_id = auth.uid()))
with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = sales_ai_leads.workspace_id and wm.user_id = auth.uid()));

/* admin_alerts */
drop policy if exists "admin_alerts_admin_only" on public.admin_alerts;
create policy "admin_alerts_admin_only" on public.admin_alerts for all to authenticated
using (exists (select 1 from public.workspace_members wm where wm.workspace_id = admin_alerts.workspace_id and wm.user_id = auth.uid() and wm.role in ('owner','admin')))
with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = admin_alerts.workspace_id and wm.user_id = auth.uid() and wm.role in ('owner','admin')));

/* security_nonces */
drop policy if exists "security_nonces_no_auth_access" on public.security_nonces;
create policy "security_nonces_no_auth_access" on public.security_nonces for select to authenticated using (false);

/* workspace_members */
drop policy if exists "workspace_members_read" on public.workspace_members;
create policy "workspace_members_read" on public.workspace_members for select to authenticated
using (user_id = auth.uid() or exists (select 1 from public.workspace_members wm2 where wm2.workspace_id = workspace_members.workspace_id and wm2.user_id = auth.uid() and wm2.role in ('owner','admin')));

drop policy if exists "workspace_members_admin_manage" on public.workspace_members;
create policy "workspace_members_admin_manage" on public.workspace_members for all to authenticated
using (exists (select 1 from public.workspace_members wm2 where wm2.workspace_id = workspace_members.workspace_id and wm2.user_id = auth.uid() and wm2.role in ('owner','admin')))
with check (exists (select 1 from public.workspace_members wm2 where wm2.workspace_id = workspace_members.workspace_id and wm2.user_id = auth.uid() and wm2.role in ('owner','admin')));

/* Harden all public function search_path */
do $$
declare r record;
begin
  for r in
    select n.nspname as sn, p.proname as fn, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
  loop
    begin
      execute format('alter function %I.%I(%s) set search_path = public', r.sn, r.fn, r.args);
    exception when others then null;
    end;
  end loop;
end $$;

/* add_workspace_member RPC */
create or replace function public.add_workspace_member(_workspace_id uuid, _user_id uuid, _role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.workspace_members wm where wm.workspace_id = _workspace_id and wm.user_id = auth.uid() and wm.role in ('owner','admin')) then raise exception 'Unauthorized'; end if;
  if _role not in ('member','manager','admin') then raise exception 'Invalid role'; end if;
  insert into public.workspace_members (workspace_id, user_id, role) values (_workspace_id, _user_id, _role) on conflict do nothing;
end; $$;

grant execute on function public.add_workspace_member(uuid, uuid, text) to authenticated;
