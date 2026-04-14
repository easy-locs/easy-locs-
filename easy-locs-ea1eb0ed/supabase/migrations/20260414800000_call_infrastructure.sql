-- Call Infrastructure Enhancement Migration
-- Adds recording support, group call rooms, and enhanced call history

-- Add recording columns to call_logs if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'call_logs' AND column_name = 'recording_path') THEN
    ALTER TABLE call_logs ADD COLUMN recording_path text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'call_logs' AND column_name = 'recording_duration_ms') THEN
    ALTER TABLE call_logs ADD COLUMN recording_duration_ms integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'call_logs' AND column_name = 'recording_consent') THEN
    ALTER TABLE call_logs ADD COLUMN recording_consent boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'call_logs' AND column_name = 'quality_score') THEN
    ALTER TABLE call_logs ADD COLUMN quality_score integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'call_logs' AND column_name = 'quality_label') THEN
    ALTER TABLE call_logs ADD COLUMN quality_label text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'call_logs' AND column_name = 'network_type') THEN
    ALTER TABLE call_logs ADD COLUMN network_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'call_logs' AND column_name = 'used_relay') THEN
    ALTER TABLE call_logs ADD COLUMN used_relay boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'call_logs' AND column_name = 'group_room_id') THEN
    ALTER TABLE call_logs ADD COLUMN group_room_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'call_logs' AND column_name = 'participant_count') THEN
    ALTER TABLE call_logs ADD COLUMN participant_count integer DEFAULT 2;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'call_logs' AND column_name = 'ended_reason') THEN
    ALTER TABLE call_logs ADD COLUMN ended_reason text;
  END IF;
END $$;

-- Group call rooms table
CREATE TABLE IF NOT EXISTS group_call_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name text NOT NULL DEFAULT 'Group Call',
  created_by uuid NOT NULL REFERENCES auth.users(id),
  mode text NOT NULL DEFAULT 'audio' CHECK (mode IN ('audio', 'video')),
  max_participants integer NOT NULL DEFAULT 8,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_sec integer,
  is_recording boolean DEFAULT false,
  recording_path text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Group call participants junction table
CREATE TABLE IF NOT EXISTS group_call_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES group_call_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  orbit_id text,
  display_name text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  was_muted boolean DEFAULT false,
  was_camera_on boolean DEFAULT false,
  connection_quality text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_call_rooms_created_by ON group_call_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_group_call_rooms_status ON group_call_rooms(status);
CREATE INDEX IF NOT EXISTS idx_group_call_participants_room ON group_call_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_group_call_participants_user ON group_call_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_group_room ON call_logs(group_room_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_recording ON call_logs(recording_path) WHERE recording_path IS NOT NULL;

-- RLS policies for group call rooms
ALTER TABLE group_call_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_call_participants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'group_call_rooms' AND policyname = 'Users can view rooms they participate in') THEN
    CREATE POLICY "Users can view rooms they participate in" ON group_call_rooms
      FOR SELECT USING (
        created_by = auth.uid()
        OR id IN (SELECT room_id FROM group_call_participants WHERE user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'group_call_rooms' AND policyname = 'Users can create rooms') THEN
    CREATE POLICY "Users can create rooms" ON group_call_rooms
      FOR INSERT WITH CHECK (created_by = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'group_call_rooms' AND policyname = 'Creators can update their rooms') THEN
    CREATE POLICY "Creators can update their rooms" ON group_call_rooms
      FOR UPDATE USING (created_by = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'group_call_participants' AND policyname = 'Users can view participants in their rooms') THEN
    CREATE POLICY "Users can view participants in their rooms" ON group_call_participants
      FOR SELECT USING (
        user_id = auth.uid()
        OR room_id IN (SELECT id FROM group_call_rooms WHERE created_by = auth.uid())
        OR room_id IN (SELECT room_id FROM group_call_participants WHERE user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'group_call_participants' AND policyname = 'Users can join rooms') THEN
    CREATE POLICY "Users can join rooms" ON group_call_participants
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'group_call_participants' AND policyname = 'Users can update their own participation') THEN
    CREATE POLICY "Users can update their own participation" ON group_call_participants
      FOR UPDATE USING (user_id = auth.uid());
  END IF;
END $$;
