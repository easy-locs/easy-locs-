
-- Test batch tracking table
CREATE TABLE IF NOT EXISTS import_test_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name text NOT NULL,
  batch_type text NOT NULL DEFAULT 'merchant_import_test',
  status text NOT NULL DEFAULT 'created',
  total_records integer NOT NULL DEFAULT 0,
  imported_records integer NOT NULL DEFAULT 0,
  failed_records integer NOT NULL DEFAULT 0,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Add test batch columns to merchant_onboarding_profiles
ALTER TABLE merchant_onboarding_profiles
  ADD COLUMN IF NOT EXISTS test_batch_id text NULL,
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by_test boolean NOT NULL DEFAULT false;

-- Add test batch columns to storefront_pages
ALTER TABLE storefront_pages
  ADD COLUMN IF NOT EXISTS test_batch_id text NULL,
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by_test boolean NOT NULL DEFAULT false;

-- Add test batch columns to menu_items
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS test_batch_id text NULL,
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by_test boolean NOT NULL DEFAULT false;

-- Add test batch columns to catalog_items
ALTER TABLE catalog_items
  ADD COLUMN IF NOT EXISTS test_batch_id text NULL,
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by_test boolean NOT NULL DEFAULT false;

-- RLS: authenticated can manage test batches
ALTER TABLE import_test_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage test batches"
  ON import_test_batches FOR ALL TO authenticated USING (true) WITH CHECK (true);
