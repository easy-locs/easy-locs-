CREATE TABLE IF NOT EXISTS prayer_push_schedules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_date date NOT NULL,
  prayers jsonb NOT NULL DEFAULT '[]'::jsonb,
  offset_minutes integer NOT NULL DEFAULT 0,
  timezone text NOT NULL DEFAULT 'UTC',
  lat double precision,
  lng double precision,
  sent_prayers text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, schedule_date)
);

CREATE INDEX IF NOT EXISTS idx_prayer_push_schedules_date
  ON prayer_push_schedules(schedule_date);

CREATE INDEX IF NOT EXISTS idx_prayer_push_schedules_user
  ON prayer_push_schedules(user_id);

ALTER TABLE prayer_push_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own prayer push schedules"
  ON prayer_push_schedules
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access prayer push schedules"
  ON prayer_push_schedules
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION append_sent_prayer(
  p_user_id uuid,
  p_date date,
  p_prayer_name text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT (
    current_setting('request.jwt.claim.role', true) = 'service_role'
    OR auth.uid() = p_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: cannot modify prayer schedules for another user';
  END IF;

  UPDATE prayer_push_schedules
  SET sent_prayers = array_append(sent_prayers, p_prayer_name),
      updated_at = now()
  WHERE user_id = p_user_id
    AND schedule_date = p_date
    AND NOT (p_prayer_name = ANY(sent_prayers));
END;
$$;

REVOKE ALL ON FUNCTION append_sent_prayer(uuid, date, text) FROM anon;
GRANT EXECUTE ON FUNCTION append_sent_prayer(uuid, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION append_sent_prayer(uuid, date, text) TO service_role;
