CREATE TABLE IF NOT EXISTS eta_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES mobility_jobs(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid(),
  prediction_type text NOT NULL CHECK (prediction_type IN ('booking', 'dispatch', 'live_update')),
  predicted_eta_minutes numeric NOT NULL,
  predicted_range_min numeric NOT NULL,
  predicted_range_max numeric NOT NULL,
  traffic_level text,
  weather_impact text,
  rush_hour_multiplier numeric,
  confidence_score numeric,
  origin_lat double precision NOT NULL,
  origin_lng double precision NOT NULL,
  destination_lat double precision NOT NULL,
  destination_lng double precision NOT NULL,
  actual_duration_minutes numeric,
  accuracy_score numeric,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_eta_predictions_job_id ON eta_predictions(job_id);
CREATE INDEX idx_eta_predictions_created_at ON eta_predictions(created_at);
CREATE INDEX idx_eta_predictions_type ON eta_predictions(prediction_type);
CREATE INDEX idx_eta_predictions_created_by ON eta_predictions(created_by);

ALTER TABLE eta_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on eta_predictions"
  ON eta_predictions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated insert own predictions"
  ON eta_predictions
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Authenticated read own predictions"
  ON eta_predictions
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Authenticated update own predictions"
  ON eta_predictions
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
