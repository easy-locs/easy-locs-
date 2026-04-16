-- DLD Transactions table stub for Dubai Market Intelligence (Task #190)
-- This migration creates the schema for storing DLD transaction data.
-- Currently the app uses hardcoded fallback data; this table will be
-- populated when the DLD data feed integration is activated.

CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TABLE IF NOT EXISTS analytics.dld_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT UNIQUE NOT NULL,
  district TEXT NOT NULL,
  property_type TEXT NOT NULL CHECK (property_type IN ('apartment','villa','townhouse','penthouse','office','land')),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale','mortgage','gift')),
  amount NUMERIC(15,2) NOT NULL,
  area_sqft NUMERIC(10,2) NOT NULL,
  price_per_sqft NUMERIC(10,2) NOT NULL,
  bedrooms INTEGER,
  building_name TEXT,
  developer TEXT,
  buyer_nationality TEXT,
  transaction_date DATE NOT NULL,
  registration_date DATE,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dld_tx_district ON analytics.dld_transactions (district);
CREATE INDEX IF NOT EXISTS idx_dld_tx_date ON analytics.dld_transactions (transaction_date);
CREATE INDEX IF NOT EXISTS idx_dld_tx_type ON analytics.dld_transactions (property_type);
CREATE INDEX IF NOT EXISTS idx_dld_tx_district_date ON analytics.dld_transactions (district, transaction_date);
CREATE INDEX IF NOT EXISTS idx_dld_tx_amount ON analytics.dld_transactions (amount);
CREATE INDEX IF NOT EXISTS idx_dld_tx_building ON analytics.dld_transactions (building_name);
CREATE INDEX IF NOT EXISTS idx_dld_tx_building_date ON analytics.dld_transactions (building_name, transaction_date);

ALTER TABLE analytics.dld_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dld_transactions_read_all"
  ON analytics.dld_transactions
  FOR SELECT
  USING (true);

COMMENT ON TABLE analytics.dld_transactions IS 'DLD (Dubai Land Department) transaction records for market intelligence analytics. Task #190.';
