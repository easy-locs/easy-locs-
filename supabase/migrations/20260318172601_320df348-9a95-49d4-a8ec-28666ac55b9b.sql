
-- Add lifecycle columns to ride_requests
alter table public.ride_requests
  add column if not exists driver_arrived_at timestamptz,
  add column if not exists pickup_confirmed_at timestamptz,
  add column if not exists trip_started_at timestamptz,
  add column if not exists trip_ended_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists final_amount numeric,
  add column if not exists settlement_status text default 'pending';

-- RPC: mark driver arrived
create or replace function public.ride_mark_arrived(
  p_ride_request_id uuid,
  p_driver_id uuid
)
returns jsonb
language plpgsql
as $$
declare
  v_selected uuid;
  v_status text;
begin
  select selected_driver_id, status
  into v_selected, v_status
  from public.ride_requests
  where id = p_ride_request_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'ride_not_found');
  end if;
  if v_selected <> p_driver_id then
    return jsonb_build_object('ok', false, 'error', 'not_assigned_driver');
  end if;
  if v_status <> 'assigned' then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  update public.ride_requests
  set status = 'driver_arrived', driver_arrived_at = now(), updated_at = now()
  where id = p_ride_request_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- RPC: confirm pickup & start trip
create or replace function public.ride_confirm_pickup(
  p_ride_request_id uuid,
  p_driver_id uuid
)
returns jsonb
language plpgsql
as $$
declare
  v_selected uuid;
  v_status text;
begin
  select selected_driver_id, status
  into v_selected, v_status
  from public.ride_requests
  where id = p_ride_request_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'ride_not_found');
  end if;
  if v_selected <> p_driver_id then
    return jsonb_build_object('ok', false, 'error', 'not_assigned_driver');
  end if;
  if v_status not in ('assigned', 'driver_arrived') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  update public.ride_requests
  set status = 'in_progress', pickup_confirmed_at = now(), trip_started_at = now(), updated_at = now()
  where id = p_ride_request_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- RPC: complete ride
create or replace function public.ride_complete(
  p_ride_request_id uuid,
  p_driver_id uuid,
  p_final_amount numeric
)
returns jsonb
language plpgsql
as $$
declare
  v_selected uuid;
  v_status text;
begin
  select selected_driver_id, status
  into v_selected, v_status
  from public.ride_requests
  where id = p_ride_request_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'ride_not_found');
  end if;
  if v_selected <> p_driver_id then
    return jsonb_build_object('ok', false, 'error', 'not_assigned_driver');
  end if;
  if v_status not in ('in_progress', 'driver_arrived') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  update public.ride_requests
  set status = 'completed', trip_ended_at = now(), completed_at = now(), final_amount = p_final_amount, updated_at = now()
  where id = p_ride_request_id;

  return jsonb_build_object('ok', true);
end;
$$;
