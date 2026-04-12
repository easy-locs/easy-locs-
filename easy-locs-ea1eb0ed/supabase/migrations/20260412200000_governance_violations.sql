CREATE TABLE IF NOT EXISTS governance_violations (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  message TEXT NOT NULL,
  owner_domain TEXT NOT NULL,
  vertical TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  auto_remediated BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gv_severity ON governance_violations (severity);
CREATE INDEX idx_gv_type ON governance_violations (type);
CREATE INDEX idx_gv_vertical ON governance_violations (vertical);
CREATE INDEX idx_gv_detected_at ON governance_violations (detected_at DESC);
CREATE INDEX idx_gv_owner_domain ON governance_violations (owner_domain);
CREATE INDEX idx_gv_resolved ON governance_violations (resolved_at) WHERE resolved_at IS NULL;

ALTER TABLE governance_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can read governance violations"
  ON governance_violations FOR SELECT
  USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Service role can insert governance violations"
  ON governance_violations FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Service role can update governance violations"
  ON governance_violations FOR UPDATE
  USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');
