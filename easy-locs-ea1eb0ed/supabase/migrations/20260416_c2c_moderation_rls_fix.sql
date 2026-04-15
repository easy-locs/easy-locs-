-- Fix: Tighten c2c_moderation_queue RLS policies
-- Corrective migration for environments that already ran the original permissive policies
-- Runs after 20260415_c2c_tables.sql which creates the table

DO $$ BEGIN
  IF to_regclass('public.c2c_moderation_queue') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "c2c_moderation_queue_insert" ON c2c_moderation_queue';
    EXECUTE 'DROP POLICY IF EXISTS "c2c_moderation_queue_read" ON c2c_moderation_queue';
    EXECUTE 'DROP POLICY IF EXISTS "c2c_moderation_queue_update" ON c2c_moderation_queue';
    EXECUTE 'DROP POLICY IF EXISTS "c2c_moderation_queue_service_role_update" ON c2c_moderation_queue';

    EXECUTE 'CREATE POLICY "c2c_moderation_queue_insert" ON c2c_moderation_queue FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)';

    EXECUTE 'CREATE POLICY "c2c_moderation_queue_read" ON c2c_moderation_queue FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM marketplace_services ms
        WHERE ms.id = c2c_moderation_queue.listing_id
          AND ms.user_id = auth.uid()
      )
    )';

    EXECUTE 'CREATE POLICY "c2c_moderation_queue_service_role_update" ON c2c_moderation_queue FOR UPDATE USING (
      (current_setting(''request.jwt.claims'', true)::json->>''role'') = ''service_role''
    )';
  END IF;
END $$;
