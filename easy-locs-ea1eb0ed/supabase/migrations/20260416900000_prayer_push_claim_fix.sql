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
BEGIN
  UPDATE prayer_push_schedules
  SET sent_prayers = array_append(sent_prayers, p_prayer_name),
      updated_at = now()
  WHERE user_id = p_user_id
    AND schedule_date = p_date
    AND NOT (p_prayer_name = ANY(sent_prayers));

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RETURN v_row_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION claim_prayer_send(uuid, date, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_prayer_send(uuid, date, text) TO service_role;
