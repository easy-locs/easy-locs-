ALTER TABLE governance_violations ADD COLUMN IF NOT EXISTS engine TEXT;
ALTER TABLE governance_violations ADD COLUMN IF NOT EXISTS route TEXT;
ALTER TABLE governance_violations ADD COLUMN IF NOT EXISTS correlation_id TEXT;
ALTER TABLE governance_violations ADD COLUMN IF NOT EXISTS dedup_key TEXT;
ALTER TABLE governance_violations ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE governance_violations ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE governance_violations ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE governance_violations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved'));
ALTER TABLE governance_violations ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_gv_engine ON governance_violations (engine);
CREATE INDEX IF NOT EXISTS idx_gv_route ON governance_violations (route);
CREATE INDEX IF NOT EXISTS idx_gv_correlation_id ON governance_violations (correlation_id);
CREATE INDEX IF NOT EXISTS idx_gv_dedup_key ON governance_violations (dedup_key);
CREATE INDEX IF NOT EXISTS idx_gv_code ON governance_violations (code);
CREATE INDEX IF NOT EXISTS idx_gv_status ON governance_violations (status);
CREATE INDEX IF NOT EXISTS idx_gv_created_at ON governance_violations (created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_gv_dedup_unique
  ON governance_violations (dedup_key)
  WHERE dedup_key IS NOT NULL AND status = 'new';

DROP POLICY IF EXISTS "Service role can read governance violations" ON governance_violations;
DROP POLICY IF EXISTS "Service role can insert governance violations" ON governance_violations;
DROP POLICY IF EXISTS "Service role can update governance violations" ON governance_violations;

CREATE POLICY "Authenticated users can read governance violations"
  ON governance_violations FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert governance violations"
  ON governance_violations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update own violations"
  ON governance_violations FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
