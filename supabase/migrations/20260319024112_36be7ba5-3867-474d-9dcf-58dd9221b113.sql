
-- =========================================================
-- DISPATCH ENGINE TABLES
-- =========================================================

-- Add columns to dispatch_jobs if they don't exist
DO $$ BEGIN
  ALTER TABLE dispatch_jobs ADD COLUMN IF NOT EXISTS pickup_lat numeric;
  ALTER TABLE dispatch_jobs ADD COLUMN IF NOT EXISTS pickup_lng numeric;
  ALTER TABLE dispatch_jobs ADD COLUMN IF NOT EXISTS dropoff_lat numeric;
  ALTER TABLE dispatch_jobs ADD COLUMN IF NOT EXISTS dropoff_lng numeric;
  ALTER TABLE dispatch_jobs ADD COLUMN IF NOT EXISTS country_code text;
  ALTER TABLE dispatch_jobs ADD COLUMN IF NOT EXISTS city text;
  ALTER TABLE dispatch_jobs ADD COLUMN IF NOT EXISTS distance_km numeric;
  ALTER TABLE dispatch_jobs ADD COLUMN IF NOT EXISTS estimated_duration_min int;
  ALTER TABLE dispatch_jobs ADD COLUMN IF NOT EXISTS assigned_driver_wallet_id uuid;
  ALTER TABLE dispatch_jobs ADD COLUMN IF NOT EXISTS ranking_snapshot jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE dispatch_jobs ADD COLUMN IF NOT EXISTS retry_count int DEFAULT 0;
  ALTER TABLE dispatch_jobs ADD COLUMN IF NOT EXISTS picked_up_at timestamptz;
  ALTER TABLE dispatch_jobs ADD COLUMN IF NOT EXISTS driver_arriving_at timestamptz;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Dispatch offers table
CREATE TABLE IF NOT EXISTS dispatch_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  driver_profile_id text NOT NULL,
  driver_user_id text NOT NULL,
  offer_status text NOT NULL DEFAULT 'pending',
  score numeric DEFAULT 0,
  eta_minutes int DEFAULT 0,
  distance_km numeric DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_offers_job ON dispatch_offers(job_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_offers_driver ON dispatch_offers(driver_user_id);

-- Automation workflows table
CREATE TABLE IF NOT EXISTS automation_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  trigger_source text,
  status text NOT NULL DEFAULT 'queued',
  current_step int NOT NULL DEFAULT 0,
  steps_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  scheduled_at timestamptz,
  executed_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  retry_count int NOT NULL DEFAULT 0,
  stop_reason text,
  country_code text,
  city text,
  vertical text,
  priority int NOT NULL DEFAULT 50,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_wf_entity ON automation_workflows(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_automation_wf_status ON automation_workflows(status);
CREATE INDEX IF NOT EXISTS idx_automation_wf_type ON automation_workflows(workflow_type);

-- Driver profiles enhancements
DO $$ BEGIN
  ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;
  ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT true;
  ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS current_lat numeric;
  ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS current_lng numeric;
  ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS heading numeric;
  ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS last_location_at timestamptz;
  ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS vehicle_type text DEFAULT 'car';
  ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS service_radius_km numeric DEFAULT 15;
  ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS max_active_jobs int DEFAULT 3;
  ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS active_jobs int DEFAULT 0;
  ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS city text;
  ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS country_code text DEFAULT 'AE';
  ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS rating numeric DEFAULT 4.5;
  ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS acceptance_rate numeric DEFAULT 0.8;
  ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS reliability_score numeric DEFAULT 0.9;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Enable RLS on new tables
ALTER TABLE dispatch_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_workflows ENABLE ROW LEVEL SECURITY;

-- RLS policies for dispatch_offers
CREATE POLICY "Authenticated users can read dispatch_offers" ON dispatch_offers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert dispatch_offers" ON dispatch_offers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update dispatch_offers" ON dispatch_offers FOR UPDATE TO authenticated USING (true);

-- RLS policies for automation_workflows
CREATE POLICY "Authenticated users can read automation_workflows" ON automation_workflows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert automation_workflows" ON automation_workflows FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update automation_workflows" ON automation_workflows FOR UPDATE TO authenticated USING (true);
