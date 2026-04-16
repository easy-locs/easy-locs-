ALTER TABLE prayer_push_schedules
  ADD COLUMN IF NOT EXISTS prayer_send_states jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS max_retry_count integer NOT NULL DEFAULT 3;

UPDATE prayer_push_schedules
SET prayer_send_states = (
  SELECT COALESCE(
    jsonb_object_agg(elem, jsonb_build_object('state', 'sent', 'retry_count', 0, 'claimed_at', null)),
    '{}'::jsonb
  )
  FROM unnest(sent_prayers) AS elem
)
WHERE array_length(sent_prayers, 1) > 0;

CREATE OR REPLACE FUNCTION claim_prayer_send(
  p_user_id uuid,
  p_date date,
  p_prayer_name text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row_count integer;
  v_current_state text;
  v_retry_count integer;
  v_max_retries integer;
  v_claimed_at timestamptz;
  v_claim_stale boolean;
BEGIN
  SELECT
    prayer_send_states -> p_prayer_name ->> 'state',
    COALESCE((prayer_send_states -> p_prayer_name ->> 'retry_count')::integer, 0),
    max_retry_count,
    (prayer_send_states -> p_prayer_name ->> 'claimed_at')::timestamptz
  INTO v_current_state, v_retry_count, v_max_retries, v_claimed_at
  FROM prayer_push_schedules
  WHERE user_id = p_user_id AND schedule_date = p_date
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_current_state = 'sent' THEN
    RETURN false;
  END IF;

  v_claim_stale := v_current_state = 'claimed'
    AND v_claimed_at IS NOT NULL
    AND v_claimed_at < now() - interval '5 minutes';

  IF v_current_state = 'claimed' AND NOT v_claim_stale THEN
    RETURN false;
  END IF;

  IF v_current_state = 'failed' AND v_retry_count >= v_max_retries THEN
    RETURN false;
  END IF;

  UPDATE prayer_push_schedules
  SET prayer_send_states = jsonb_set(
        COALESCE(prayer_send_states, '{}'::jsonb),
        ARRAY[p_prayer_name],
        jsonb_build_object(
          'state', 'claimed',
          'retry_count', COALESCE(v_retry_count, 0),
          'claimed_at', to_jsonb(now())
        )
      ),
      sent_prayers = CASE
        WHEN NOT (p_prayer_name = ANY(sent_prayers))
        THEN array_append(sent_prayers, p_prayer_name)
        ELSE sent_prayers
      END,
      updated_at = now()
  WHERE user_id = p_user_id
    AND schedule_date = p_date;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RETURN v_row_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION claim_prayer_send(uuid, date, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_prayer_send(uuid, date, text) TO service_role;

CREATE OR REPLACE FUNCTION mark_prayer_sent(
  p_user_id uuid,
  p_date date,
  p_prayer_name text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row_count integer;
BEGIN
  UPDATE prayer_push_schedules
  SET prayer_send_states = jsonb_set(
        COALESCE(prayer_send_states, '{}'::jsonb),
        ARRAY[p_prayer_name],
        jsonb_build_object(
          'state', 'sent',
          'retry_count', COALESCE((prayer_send_states -> p_prayer_name ->> 'retry_count')::integer, 0),
          'claimed_at', null
        )
      ),
      updated_at = now()
  WHERE user_id = p_user_id
    AND schedule_date = p_date
    AND prayer_send_states -> p_prayer_name ->> 'state' = 'claimed';

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RETURN v_row_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION mark_prayer_sent(uuid, date, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION mark_prayer_sent(uuid, date, text) TO service_role;

CREATE OR REPLACE FUNCTION mark_prayer_failed(
  p_user_id uuid,
  p_date date,
  p_prayer_name text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row_count integer;
BEGIN
  UPDATE prayer_push_schedules
  SET prayer_send_states = jsonb_set(
        COALESCE(prayer_send_states, '{}'::jsonb),
        ARRAY[p_prayer_name],
        jsonb_build_object(
          'state', 'failed',
          'retry_count', COALESCE((prayer_send_states -> p_prayer_name ->> 'retry_count')::integer, 0) + 1,
          'claimed_at', null
        )
      ),
      sent_prayers = array_remove(sent_prayers, p_prayer_name),
      updated_at = now()
  WHERE user_id = p_user_id
    AND schedule_date = p_date
    AND prayer_send_states -> p_prayer_name ->> 'state' = 'claimed';

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RETURN v_row_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION mark_prayer_failed(uuid, date, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION mark_prayer_failed(uuid, date, text) TO service_role;

CREATE INDEX IF NOT EXISTS idx_prayer_push_send_states
  ON prayer_push_schedules USING gin (prayer_send_states);
