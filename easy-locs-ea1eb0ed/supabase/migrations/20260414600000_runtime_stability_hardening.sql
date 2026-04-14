-- ============================================================================
-- Runtime Stability Hardening — Durcissement Complet 2026
-- Server-persisted kill switches, feature flags, state machine checkpoints,
-- anomaly detection, domain degradation, read models, DB observability
-- ============================================================================

-- ── kill_switches_server — Server-persisted kill switches with audit trail ───
CREATE TABLE IF NOT EXISTS kill_switches_server (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature       text NOT NULL UNIQUE,
  domain        text NOT NULL,
  enabled       boolean NOT NULL DEFAULT true,
  reason        text,
  toggled_by    text NOT NULL DEFAULT 'system',
  toggled_at    timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ks_server_domain ON kill_switches_server (domain);
CREATE INDEX IF NOT EXISTS idx_ks_server_feature ON kill_switches_server (feature);

CREATE TABLE IF NOT EXISTS kill_switch_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature       text NOT NULL,
  domain        text NOT NULL,
  actor         text NOT NULL,
  reason        text,
  before_state  boolean NOT NULL,
  after_state   boolean NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ks_audit_feature ON kill_switch_audit_log (feature);
CREATE INDEX IF NOT EXISTS idx_ks_audit_created ON kill_switch_audit_log (created_at DESC);

-- ── feature_flags_server — Server-persisted feature flags ───────────────────
CREATE TABLE IF NOT EXISTS feature_flags_server (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL UNIQUE,
  domain            text NOT NULL,
  enabled           boolean NOT NULL DEFAULT true,
  rollout_percentage integer NOT NULL DEFAULT 100 CHECK (rollout_percentage BETWEEN 0 AND 100),
  environments      text[] NOT NULL DEFAULT '{production,staging,development}',
  updated_by        text NOT NULL DEFAULT 'system',
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ff_server_domain ON feature_flags_server (domain);
CREATE INDEX IF NOT EXISTS idx_ff_server_name ON feature_flags_server (name);

-- ── domain_degradation_modes — Per-domain degradation state ─────────────────
CREATE TABLE IF NOT EXISTS domain_degradation_modes (
  domain            text PRIMARY KEY,
  mode              text NOT NULL DEFAULT 'normal'
                      CHECK (mode IN ('normal','read_only','write_freeze','partial_disable',
                                      'attachment_disable','background_pause','queue_pause',
                                      'admin_only','quarantine')),
  reason            text,
  activated_by      text NOT NULL DEFAULT 'system',
  activated_at      timestamptz NOT NULL DEFAULT now(),
  auto_restore_at   timestamptz,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS degradation_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain        text NOT NULL,
  actor         text NOT NULL,
  reason        text,
  before_mode   text NOT NULL,
  after_mode    text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_degrad_audit_domain ON degradation_audit_log (domain);
CREATE INDEX IF NOT EXISTS idx_degrad_audit_created ON degradation_audit_log (created_at DESC);

-- ── state_machine_checkpoints — Persistent state machine snapshots ──────────
CREATE TABLE IF NOT EXISTS state_machine_checkpoints (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id         text NOT NULL,
  flow_type       text NOT NULL,
  machine_name    text NOT NULL,
  current_state   text NOT NULL,
  previous_state  text,
  event           text NOT NULL,
  transition_id   text NOT NULL,
  guard_results   jsonb DEFAULT '{}',
  context_data    jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sm_checkpoint_flow ON state_machine_checkpoints (flow_id);
CREATE INDEX IF NOT EXISTS idx_sm_checkpoint_type ON state_machine_checkpoints (flow_type);
CREATE INDEX IF NOT EXISTS idx_sm_checkpoint_created ON state_machine_checkpoints (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sm_checkpoint_transition ON state_machine_checkpoints (transition_id);

CREATE TABLE IF NOT EXISTS state_machine_incidents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id         text NOT NULL,
  flow_type       text NOT NULL,
  current_state   text NOT NULL,
  attempted_event text NOT NULL,
  rejection_reason text NOT NULL,
  correlation_id  text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sm_incident_flow ON state_machine_incidents (flow_id);
CREATE INDEX IF NOT EXISTS idx_sm_incident_created ON state_machine_incidents (created_at DESC);

-- ── anomaly_detection_windows — Sliding window metrics per domain ───────────
CREATE TABLE IF NOT EXISTS anomaly_detection_windows (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain              text NOT NULL,
  window_start        timestamptz NOT NULL,
  window_end          timestamptz NOT NULL,
  error_count         integer NOT NULL DEFAULT 0,
  success_count       integer NOT NULL DEFAULT 0,
  error_velocity      numeric(8,4) NOT NULL DEFAULT 0,
  p95_latency_ms      integer NOT NULL DEFAULT 0,
  p99_latency_ms      integer NOT NULL DEFAULT 0,
  retry_storm_count   integer NOT NULL DEFAULT 0,
  queue_backlog_depth integer NOT NULL DEFAULT 0,
  mutation_rejection_rate numeric(5,4) NOT NULL DEFAULT 0,
  reconnect_frequency integer NOT NULL DEFAULT 0,
  invalid_transition_count integer NOT NULL DEFAULT 0,
  stale_data_frequency integer NOT NULL DEFAULT 0,
  anomaly_detected    boolean NOT NULL DEFAULT false,
  actions_taken       text[] DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anomaly_domain ON anomaly_detection_windows (domain);
CREATE INDEX IF NOT EXISTS idx_anomaly_window ON anomaly_detection_windows (window_start DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_detected ON anomaly_detection_windows (anomaly_detected) WHERE anomaly_detected = true;

-- ── preemptive_actions_log — Audit trail for anomaly-driven actions ──────────
CREATE TABLE IF NOT EXISTS preemptive_actions_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain          text NOT NULL,
  action_type     text NOT NULL,
  trigger_metric  text NOT NULL,
  trigger_value   numeric NOT NULL,
  threshold       numeric NOT NULL,
  before_state    jsonb NOT NULL DEFAULT '{}',
  after_state     jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preemptive_domain ON preemptive_actions_log (domain);
CREATE INDEX IF NOT EXISTS idx_preemptive_created ON preemptive_actions_log (created_at DESC);

-- ── read_model_dashboard_cards — Canonical read models for dashboards ───────
CREATE TABLE IF NOT EXISTS read_model_dashboard_cards (
  card_id         text PRIMARY KEY,
  card_type       text NOT NULL,
  domain          text NOT NULL,
  title           text NOT NULL,
  value           jsonb NOT NULL DEFAULT '{}',
  status          text NOT NULL DEFAULT 'ok'
                    CHECK (status IN ('ok','warning','error','loading','empty','stale')),
  freshness_ttl_s integer NOT NULL DEFAULT 300,
  last_computed_at timestamptz NOT NULL DEFAULT now(),
  owner_query     text,
  error_policy    text DEFAULT 'show_stale',
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rm_cards_domain ON read_model_dashboard_cards (domain);
CREATE INDEX IF NOT EXISTS idx_rm_cards_type ON read_model_dashboard_cards (card_type);

-- ── db_observability_metrics — Infrastructure health metrics ────────────────
CREATE TABLE IF NOT EXISTS db_observability_metrics (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name     text NOT NULL,
  metric_value    numeric NOT NULL,
  metric_unit     text NOT NULL DEFAULT 'count',
  threshold_warn  numeric,
  threshold_crit  numeric,
  is_alert        boolean NOT NULL DEFAULT false,
  metadata        jsonb DEFAULT '{}',
  recorded_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_db_obs_name ON db_observability_metrics (metric_name);
CREATE INDEX IF NOT EXISTS idx_db_obs_recorded ON db_observability_metrics (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_db_obs_alert ON db_observability_metrics (is_alert) WHERE is_alert = true;

-- ── boundary_validation_quarantine — Quarantined invalid payloads ───────────
CREATE TABLE IF NOT EXISTS boundary_validation_quarantine (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boundary_name   text NOT NULL,
  schema_version  text,
  payload_hash    text,
  original_payload jsonb NOT NULL DEFAULT '{}',
  validation_errors jsonb NOT NULL DEFAULT '[]',
  correlation_id  text,
  source_domain   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bvq_boundary ON boundary_validation_quarantine (boundary_name);
CREATE INDEX IF NOT EXISTS idx_bvq_created ON boundary_validation_quarantine (created_at DESC);

-- ── queue_dedup_window — Dedup tracking for job queue ───────────────────────
CREATE TABLE IF NOT EXISTS queue_dedup_window (
  fingerprint     text NOT NULL,
  queue_name      text NOT NULL,
  job_id          uuid NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  PRIMARY KEY (fingerprint, queue_name)
);

CREATE INDEX IF NOT EXISTS idx_dedup_expires ON queue_dedup_window (expires_at);

-- ── queue_domain_pause — Per-domain/queue pause state ───────────────────────
CREATE TABLE IF NOT EXISTS queue_domain_pause (
  queue_name      text PRIMARY KEY,
  paused          boolean NOT NULL DEFAULT false,
  paused_by       text,
  paused_at       timestamptz,
  reason          text,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── queue_poison_messages — Detected poison messages ────────────────────────
CREATE TABLE IF NOT EXISTS queue_poison_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name      text NOT NULL,
  original_job_id uuid,
  payload_hash    text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}',
  failure_count   integer NOT NULL DEFAULT 0,
  last_error      text,
  quarantined_at  timestamptz NOT NULL DEFAULT now(),
  status          text NOT NULL DEFAULT 'quarantined'
                    CHECK (status IN ('quarantined','reviewed','resolved','discarded'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_poison_queue_hash ON queue_poison_messages (queue_name, payload_hash);
CREATE INDEX IF NOT EXISTS idx_poison_queue ON queue_poison_messages (queue_name);
CREATE INDEX IF NOT EXISTS idx_poison_status ON queue_poison_messages (status);

-- ════════════════════════════════════════════════════════════════════════════
-- RPCs
-- ════════════════════════════════════════════════════════════════════════════

-- ── toggle_kill_switch_server() — Toggle with audit trail ───────────────────
CREATE OR REPLACE FUNCTION toggle_kill_switch_server(
  p_feature     text,
  p_enabled     boolean,
  p_actor       text DEFAULT 'system',
  p_reason      text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_before boolean;
  v_domain text;
BEGIN
  SELECT enabled, domain INTO v_before, v_domain
  FROM kill_switches_server WHERE feature = p_feature;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Feature not found: ' || p_feature);
  END IF;

  UPDATE kill_switches_server
  SET enabled = p_enabled,
      reason = COALESCE(p_reason, reason),
      toggled_by = p_actor,
      toggled_at = now()
  WHERE feature = p_feature;

  INSERT INTO kill_switch_audit_log (feature, domain, actor, reason, before_state, after_state)
  VALUES (p_feature, v_domain, p_actor, p_reason, v_before, p_enabled);

  PERFORM emit_server_event(
    'kill_switch.toggled',
    jsonb_build_object('feature', p_feature, 'before', v_before, 'after', p_enabled, 'actor', p_actor, 'reason', p_reason),
    'control-plane',
    'warn'
  );

  RETURN jsonb_build_object('ok', true, 'feature', p_feature, 'before', v_before, 'after', p_enabled);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── set_domain_degradation() — Change domain mode with audit ────────────────
CREATE OR REPLACE FUNCTION set_domain_degradation(
  p_domain      text,
  p_mode        text,
  p_actor       text DEFAULT 'system',
  p_reason      text DEFAULT NULL,
  p_auto_restore_minutes integer DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_before text;
  v_auto_restore timestamptz;
BEGIN
  IF p_auto_restore_minutes IS NOT NULL THEN
    v_auto_restore := now() + (p_auto_restore_minutes || ' minutes')::interval;
  END IF;

  SELECT mode INTO v_before FROM domain_degradation_modes WHERE domain = p_domain;

  IF NOT FOUND THEN
    INSERT INTO domain_degradation_modes (domain, mode, reason, activated_by, auto_restore_at)
    VALUES (p_domain, p_mode, p_reason, p_actor, v_auto_restore);
    v_before := 'normal';
  ELSE
    UPDATE domain_degradation_modes
    SET mode = p_mode,
        reason = p_reason,
        activated_by = p_actor,
        activated_at = now(),
        auto_restore_at = v_auto_restore,
        updated_at = now()
    WHERE domain = p_domain;
  END IF;

  INSERT INTO degradation_audit_log (domain, actor, reason, before_mode, after_mode)
  VALUES (p_domain, p_actor, p_reason, COALESCE(v_before, 'normal'), p_mode);

  PERFORM emit_server_event(
    'domain.degradation_changed',
    jsonb_build_object('domain', p_domain, 'before', COALESCE(v_before, 'normal'), 'after', p_mode, 'reason', p_reason),
    'control-plane',
    CASE WHEN p_mode = 'quarantine' THEN 'critical' WHEN p_mode != 'normal' THEN 'warn' ELSE 'info' END
  );

  RETURN jsonb_build_object('ok', true, 'domain', p_domain, 'before', COALESCE(v_before, 'normal'), 'after', p_mode);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── record_state_machine_checkpoint() — Persist transition checkpoints ──────
CREATE OR REPLACE FUNCTION record_state_machine_checkpoint(
  p_flow_id       text,
  p_flow_type     text,
  p_machine_name  text,
  p_current_state text,
  p_previous_state text,
  p_event         text,
  p_transition_id text,
  p_guard_results jsonb DEFAULT '{}',
  p_context_data  jsonb DEFAULT '{}'
) RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO state_machine_checkpoints (
    flow_id, flow_type, machine_name, current_state, previous_state,
    event, transition_id, guard_results, context_data
  ) VALUES (
    p_flow_id, p_flow_type, p_machine_name, p_current_state, p_previous_state,
    p_event, p_transition_id, p_guard_results, p_context_data
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── record_anomaly_window() — Persist anomaly detection metrics ─────────────
CREATE OR REPLACE FUNCTION record_anomaly_window(
  p_domain              text,
  p_window_start        timestamptz,
  p_window_end          timestamptz,
  p_error_count         integer DEFAULT 0,
  p_success_count       integer DEFAULT 0,
  p_error_velocity      numeric DEFAULT 0,
  p_p95_latency_ms      integer DEFAULT 0,
  p_p99_latency_ms      integer DEFAULT 0,
  p_retry_storm_count   integer DEFAULT 0,
  p_queue_backlog_depth integer DEFAULT 0,
  p_mutation_rejection_rate numeric DEFAULT 0,
  p_reconnect_frequency integer DEFAULT 0,
  p_invalid_transition_count integer DEFAULT 0,
  p_stale_data_frequency integer DEFAULT 0,
  p_anomaly_detected    boolean DEFAULT false,
  p_actions_taken       text[] DEFAULT '{}'
) RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO anomaly_detection_windows (
    domain, window_start, window_end, error_count, success_count,
    error_velocity, p95_latency_ms, p99_latency_ms, retry_storm_count,
    queue_backlog_depth, mutation_rejection_rate, reconnect_frequency,
    invalid_transition_count, stale_data_frequency, anomaly_detected, actions_taken
  ) VALUES (
    p_domain, p_window_start, p_window_end, p_error_count, p_success_count,
    p_error_velocity, p_p95_latency_ms, p_p99_latency_ms, p_retry_storm_count,
    p_queue_backlog_depth, p_mutation_rejection_rate, p_reconnect_frequency,
    p_invalid_transition_count, p_stale_data_frequency, p_anomaly_detected, p_actions_taken
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── upsert_dashboard_card() — Update read model card ────────────────────────
CREATE OR REPLACE FUNCTION upsert_dashboard_card(
  p_card_id       text,
  p_card_type     text,
  p_domain        text,
  p_title         text,
  p_value         jsonb,
  p_status        text DEFAULT 'ok',
  p_freshness_ttl integer DEFAULT 300,
  p_owner_query   text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO read_model_dashboard_cards (card_id, card_type, domain, title, value, status, freshness_ttl_s, owner_query, last_computed_at, updated_at)
  VALUES (p_card_id, p_card_type, p_domain, p_title, p_value, p_status, p_freshness_ttl, p_owner_query, now(), now())
  ON CONFLICT (card_id) DO UPDATE SET
    value = p_value,
    status = p_status,
    title = p_title,
    freshness_ttl_s = p_freshness_ttl,
    owner_query = COALESCE(p_owner_query, read_model_dashboard_cards.owner_query),
    last_computed_at = now(),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── record_db_observability() — Persist infra metrics with alerts ───────────
CREATE OR REPLACE FUNCTION record_db_observability(
  p_metric_name   text,
  p_metric_value  numeric,
  p_metric_unit   text DEFAULT 'count',
  p_threshold_warn numeric DEFAULT NULL,
  p_threshold_crit numeric DEFAULT NULL,
  p_metadata      jsonb DEFAULT '{}'
) RETURNS uuid AS $$
DECLARE
  v_id uuid;
  v_is_alert boolean := false;
BEGIN
  IF p_threshold_crit IS NOT NULL AND p_metric_value >= p_threshold_crit THEN
    v_is_alert := true;
  ELSIF p_threshold_warn IS NOT NULL AND p_metric_value >= p_threshold_warn THEN
    v_is_alert := true;
  END IF;

  INSERT INTO db_observability_metrics (metric_name, metric_value, metric_unit, threshold_warn, threshold_crit, is_alert, metadata)
  VALUES (p_metric_name, p_metric_value, p_metric_unit, p_threshold_warn, p_threshold_crit, v_is_alert, p_metadata)
  RETURNING id INTO v_id;

  IF v_is_alert THEN
    PERFORM emit_server_event(
      'db_observability.alert',
      jsonb_build_object('metric', p_metric_name, 'value', p_metric_value, 'unit', p_metric_unit, 'threshold_warn', p_threshold_warn, 'threshold_crit', p_threshold_crit),
      'db-observability',
      CASE WHEN p_threshold_crit IS NOT NULL AND p_metric_value >= p_threshold_crit THEN 'critical' ELSE 'warn' END
    );
  END IF;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── check_queue_dedup() — Check & insert dedup window entry ─────────────────
CREATE OR REPLACE FUNCTION check_queue_dedup(
  p_fingerprint text,
  p_queue_name  text,
  p_job_id      uuid,
  p_window_seconds integer DEFAULT 300
) RETURNS boolean AS $$
DECLARE
  v_exists boolean;
BEGIN
  DELETE FROM queue_dedup_window WHERE expires_at < now();

  SELECT EXISTS(
    SELECT 1 FROM queue_dedup_window
    WHERE fingerprint = p_fingerprint AND queue_name = p_queue_name
  ) INTO v_exists;

  IF v_exists THEN
    RETURN true;
  END IF;

  INSERT INTO queue_dedup_window (fingerprint, queue_name, job_id, expires_at)
  VALUES (p_fingerprint, p_queue_name, p_job_id, now() + (p_window_seconds || ' seconds')::interval)
  ON CONFLICT (fingerprint, queue_name) DO NOTHING;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Lock down SECURITY DEFINER RPCs — only service_role can execute ─────────
REVOKE EXECUTE ON FUNCTION toggle_kill_switch_server(text, boolean, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION toggle_kill_switch_server(text, boolean, text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION set_domain_degradation(text, text, text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION set_domain_degradation(text, text, text, text, integer) TO service_role;

REVOKE EXECUTE ON FUNCTION record_state_machine_checkpoint(text, text, text, text, text, text, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_state_machine_checkpoint(text, text, text, text, text, text, text, jsonb, jsonb) TO service_role;

REVOKE EXECUTE ON FUNCTION record_anomaly_window(text, timestamptz, timestamptz, integer, integer, numeric, integer, integer, integer, integer, numeric, integer, integer, integer, boolean, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_anomaly_window(text, timestamptz, timestamptz, integer, integer, numeric, integer, integer, integer, integer, numeric, integer, integer, integer, boolean, text[]) TO service_role;

REVOKE EXECUTE ON FUNCTION upsert_dashboard_card(text, text, text, text, jsonb, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_dashboard_card(text, text, text, text, jsonb, text, integer, text) TO service_role;

REVOKE EXECUTE ON FUNCTION record_db_observability(text, numeric, text, numeric, numeric, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_db_observability(text, numeric, text, numeric, numeric, jsonb) TO service_role;

REVOKE EXECUTE ON FUNCTION check_queue_dedup(text, text, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION check_queue_dedup(text, text, uuid, integer) TO service_role;

-- ── Seed default kill switches ──────────────────────────────────────────────
INSERT INTO kill_switches_server (feature, domain, enabled) VALUES
  ('orbit_calls_enabled', 'orbit_call', true),
  ('wallet_payments_enabled', 'wallet', true),
  ('wallet_topup_enabled', 'wallet', true),
  ('qr_pay_enabled', 'payment', true),
  ('invisible_directory_pay_enabled', 'payment', true),
  ('scraping_import_enabled', 'scraping', true),
  ('media_upload_enabled', 'media', true),
  ('booking_checkout_enabled', 'booking', true),
  ('realtime_presence_enabled', 'realtime', true),
  ('provider_publish_enabled', 'listing', true),
  ('flight_booking_enabled', 'flights', true),
  ('radar_live_enabled', 'radar', true),
  ('food_ordering_enabled', 'food', true),
  ('hotel_booking_enabled', 'hotel', true),
  ('services_booking_enabled', 'services', true),
  ('property_management_enabled', 'property', true),
  ('otp_enabled', 'auth', true),
  ('contact_sync_enabled', 'identity', true),
  ('notifications_enabled', 'notification', true),
  ('intelligence_enabled', 'intelligence', false),
  ('local_commerce_enabled', 'local_commerce', false)
ON CONFLICT (feature) DO NOTHING;

-- ── Seed default domain degradation modes ───────────────────────────────────
INSERT INTO domain_degradation_modes (domain, mode) VALUES
  ('auth', 'normal'), ('identity', 'normal'), ('orbit', 'normal'),
  ('orbit_call', 'normal'), ('wallet', 'normal'), ('payment', 'normal'),
  ('booking', 'normal'), ('food', 'normal'), ('hotel', 'normal'),
  ('services', 'normal'), ('flights', 'normal'), ('property', 'normal'),
  ('radar', 'normal'), ('media', 'normal'), ('listing', 'normal'),
  ('scraping', 'normal'), ('notification', 'normal'), ('realtime', 'normal'),
  ('intelligence', 'normal'), ('local_commerce', 'normal'),
  ('dashboard', 'normal'), ('admin', 'normal')
ON CONFLICT (domain) DO NOTHING;

-- ── Cleanup cron jobs ───────────────────────────────────────────────────────
SELECT cron.schedule(
  'cleanup-dedup-window',
  '*/10 * * * *',
  $$DELETE FROM queue_dedup_window WHERE expires_at < now()$$
);

SELECT cron.schedule(
  'cleanup-old-anomaly-windows',
  '0 */6 * * *',
  $$DELETE FROM anomaly_detection_windows WHERE created_at < now() - interval '7 days'$$
);

SELECT cron.schedule(
  'cleanup-old-sm-checkpoints',
  '0 */12 * * *',
  $$DELETE FROM state_machine_checkpoints WHERE created_at < now() - interval '30 days'$$
);

SELECT cron.schedule(
  'auto-restore-degradation',
  '* * * * *',
  $$UPDATE domain_degradation_modes SET mode = 'normal', reason = 'Auto-restored', updated_at = now() WHERE auto_restore_at IS NOT NULL AND auto_restore_at <= now() AND mode != 'normal'$$
);

-- ── RLS policies ────────────────────────────────────────────────────────────
ALTER TABLE kill_switches_server ENABLE ROW LEVEL SECURITY;
ALTER TABLE kill_switch_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags_server ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_degradation_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_machine_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_machine_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_detection_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE preemptive_actions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE read_model_dashboard_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE db_observability_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE boundary_validation_quarantine ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_dedup_window ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_domain_pause ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_poison_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE degradation_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_ks" ON kill_switches_server FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ks_audit" ON kill_switch_audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ff" ON feature_flags_server FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_degrad" ON domain_degradation_modes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_sm_cp" ON state_machine_checkpoints FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_sm_inc" ON state_machine_incidents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_anomaly" ON anomaly_detection_windows FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_preemptive" ON preemptive_actions_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_rm" ON read_model_dashboard_cards FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_dbobs" ON db_observability_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_bvq" ON boundary_validation_quarantine FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_dedup" ON queue_dedup_window FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_qpause" ON queue_domain_pause FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_poison" ON queue_poison_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_degrad_audit" ON degradation_audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can read kill switches and feature flags (needed for client sync)
CREATE POLICY "auth_read_ks" ON kill_switches_server FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_ff" ON feature_flags_server FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_degrad" ON domain_degradation_modes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_rm" ON read_model_dashboard_cards FOR SELECT TO authenticated USING (true);
