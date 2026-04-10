
-- dino_notifications: allow authenticated inserts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow all insert notifications' AND tablename = 'dino_notifications') THEN
    CREATE POLICY "allow all insert notifications" ON dino_notifications FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- dino_pro_performance: allow authenticated updates
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow update performance' AND tablename = 'dino_pro_performance') THEN
    CREATE POLICY "allow update performance" ON dino_pro_performance FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- dino_learning_events: allow authenticated inserts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow insert learning' AND tablename = 'dino_learning_events') THEN
    CREATE POLICY "allow insert learning" ON dino_learning_events FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- dino_visibility_overrides: allow authenticated inserts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow insert override' AND tablename = 'dino_visibility_overrides') THEN
    CREATE POLICY "allow insert override" ON dino_visibility_overrides FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;
