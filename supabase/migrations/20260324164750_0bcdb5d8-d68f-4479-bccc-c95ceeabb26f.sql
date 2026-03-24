
-- Support tickets: add missing columns if table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'reporter_user_id') THEN
    ALTER TABLE public.support_tickets ADD COLUMN reporter_user_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'assigned_to') THEN
    ALTER TABLE public.support_tickets ADD COLUMN assigned_to uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'sla_deadline') THEN
    ALTER TABLE public.support_tickets ADD COLUMN sla_deadline timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'escalated_at') THEN
    ALTER TABLE public.support_tickets ADD COLUMN escalated_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'resolved_at') THEN
    ALTER TABLE public.support_tickets ADD COLUMN resolved_at timestamptz;
  END IF;
END $$;
