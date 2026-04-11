-- ═══════════════════════════════════════════════════════════════════
-- CANONICAL CONTENT ARCHITECTURE — Database Foundation
-- Strict taxonomy, content pipeline, media truth, validation gates,
-- quarantine, locks, audit logs
-- ═══════════════════════════════════════════════════════════════════

-- ENUMS
CREATE TYPE canonical_vertical AS ENUM (
  'food', 'grocery', 'shops', 'services', 'health',
  'fitness', 'property', 'stay', 'mobility', 'utility',
  'beauty', 'experiences'
);

CREATE TYPE entity_lifecycle_status AS ENUM (
  'raw', 'normalized', 'classified', 'needs_review',
  'approved', 'published', 'quarantined', 'rejected', 'archived'
);

CREATE TYPE media_lifecycle_status AS ENUM (
  'imported', 'analyzed', 'candidate', 'approved',
  'primary_locked', 'rejected', 'quarantined'
);

CREATE TYPE import_source_type AS ENUM (
  'scraper', 'api', 'manual', 'bulk_import',
  'partner_feed', 'web_crawl', 'legacy'
);

CREATE TYPE confidence_band AS ENUM (
  'high', 'medium', 'low', 'rejected'
);

CREATE TYPE validation_gate_id AS ENUM (
  'schema', 'taxonomy', 'media', 'confidence',
  'duplicate', 'canonical_integrity', 'publish'
);

CREATE TYPE gate_result AS ENUM (
  'pass', 'fail', 'warn', 'skip'
);

CREATE TYPE lock_type AS ENUM (
  'taxonomy_lock', 'canonical_lock', 'media_lock',
  'publish_lock', 'template_lock', 'relationship_lock'
);

CREATE TYPE quarantine_reason AS ENUM (
  'low_confidence', 'taxonomy_conflict', 'canonical_conflict',
  'media_mismatch', 'duplicate_conflict', 'illegal_field_combination',
  'cross_vertical_contamination', 'missing_required_fields', 'gate_failure'
);

CREATE TYPE job_status AS ENUM (
  'pending', 'processing', 'succeeded', 'failed', 'retrying', 'quarantined'
);

CREATE TYPE moderation_status AS ENUM (
  'pending', 'approved', 'rejected', 'flagged'
);

CREATE TYPE media_lock_status AS ENUM (
  'unlocked', 'locked'
);

CREATE TYPE reclassification_status AS ENUM (
  'requested', 'analyzing', 'pending_review',
  'approved', 'rejected', 'applied'
);

CREATE TYPE audit_action AS ENUM (
  'import', 'normalize', 'classify', 'validate', 'approve',
  'reject', 'publish', 'unpublish', 'quarantine', 'unquarantine',
  'reclassify', 'media_assign', 'media_remove', 'media_lock',
  'lock_change', 'field_edit'
);

CREATE TYPE review_item_type AS ENUM (
  'entity_review', 'media_review', 'reclassification', 'quarantine_review'
);

CREATE TYPE review_priority AS ENUM (
  'low', 'medium', 'high', 'critical'
);

CREATE TYPE review_status AS ENUM (
  'pending', 'in_progress', 'completed', 'skipped'
);

-- ═══════════════════════════════════════════════════════════════════
-- TAXONOMY TABLES
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE taxonomy_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical canonical_vertical NOT NULL UNIQUE,
  label TEXT NOT NULL,
  default_media_kinds TEXT[] NOT NULL DEFAULT '{}',
  default_card_template TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE taxonomy_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES taxonomy_families(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(family_id, key)
);

CREATE TABLE taxonomy_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES taxonomy_categories(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, key)
);

CREATE TABLE canonical_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory_id UUID NOT NULL REFERENCES taxonomy_subcategories(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  allowed_media_kinds TEXT[] NOT NULL DEFAULT '{}',
  required_fields TEXT[] NOT NULL DEFAULT '{}',
  optional_fields TEXT[] NOT NULL DEFAULT '{}',
  allowed_card_templates TEXT[] NOT NULL DEFAULT '{}',
  aliases TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(subcategory_id, key)
);

CREATE TABLE canonical_subtypes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_type_id UUID NOT NULL REFERENCES canonical_types(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(canonical_type_id, key)
);

CREATE TABLE canonical_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias TEXT NOT NULL,
  canonical_path TEXT NOT NULL,
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.80,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(alias)
);

-- ═══════════════════════════════════════════════════════════════════
-- ENTITY PIPELINE TABLES
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE raw_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT NOT NULL,
  source_type import_source_type NOT NULL,
  source_url TEXT,
  raw_name TEXT NOT NULL,
  raw_address TEXT,
  raw_phone TEXT,
  raw_email TEXT,
  raw_website TEXT,
  raw_category TEXT,
  raw_subcategory TEXT,
  raw_description TEXT,
  raw_lat DOUBLE PRECISION,
  raw_lng DOUBLE PRECISION,
  raw_image_urls TEXT[] NOT NULL DEFAULT '{}',
  raw_metadata JSONB NOT NULL DEFAULT '{}',
  import_job_id UUID,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE normalized_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_entity_id UUID NOT NULL REFERENCES raw_entities(id) ON DELETE CASCADE,
  normalized_name TEXT NOT NULL,
  normalized_address TEXT,
  normalized_city TEXT,
  normalized_country TEXT,
  normalized_country_code TEXT,
  normalized_phone TEXT,
  normalized_email TEXT,
  normalized_website TEXT,
  normalized_lat DOUBLE PRECISION,
  normalized_lng DOUBLE PRECISION,
  normalized_description TEXT,
  normalized_category_hint TEXT,
  normalized_subcategory_hint TEXT,
  normalized_image_urls TEXT[] NOT NULL DEFAULT '{}',
  source_provenance JSONB NOT NULL DEFAULT '{}',
  status entity_lifecycle_status NOT NULL DEFAULT 'normalized',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE canonical_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_entity_id UUID NOT NULL REFERENCES normalized_entities(id) ON DELETE CASCADE,
  vertical canonical_vertical NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  canonical_type TEXT NOT NULL,
  canonical_subtype TEXT,
  canonical_path TEXT NOT NULL,
  confidence_score NUMERIC(5,4) NOT NULL DEFAULT 0.0,
  confidence_band confidence_band NOT NULL DEFAULT 'low',
  mapper_version TEXT NOT NULL,
  validation_status entity_lifecycle_status NOT NULL DEFAULT 'classified',
  publish_status entity_lifecycle_status NOT NULL DEFAULT 'raw',
  review_required BOOLEAN NOT NULL DEFAULT false,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  country_code TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  metadata JSONB NOT NULL DEFAULT '{}',
  source_provenance JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE entity_validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_entity_id UUID NOT NULL REFERENCES canonical_entities(id) ON DELETE CASCADE,
  gate_id validation_gate_id NOT NULL,
  result gate_result NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  risk_flags TEXT[] NOT NULL DEFAULT '{}',
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE entity_publish_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_entity_id UUID NOT NULL REFERENCES canonical_entities(id) ON DELETE CASCADE UNIQUE,
  status entity_lifecycle_status NOT NULL DEFAULT 'raw',
  published_at TIMESTAMPTZ,
  unpublished_at TIMESTAMPTZ,
  locks lock_type[] NOT NULL DEFAULT '{}',
  completeness_score NUMERIC(5,2) NOT NULL DEFAULT 0.0,
  last_validated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewer_id UUID,
  review_notes TEXT
);

-- ═══════════════════════════════════════════════════════════════════
-- MEDIA TABLES
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES canonical_entities(id) ON DELETE SET NULL,
  source_url TEXT NOT NULL,
  source_type import_source_type NOT NULL,
  source_provenance TEXT,
  stored_url TEXT,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  size_bytes BIGINT,
  format TEXT,
  fingerprint TEXT,
  detected_media_kind TEXT,
  entity_match_confidence NUMERIC(5,4) NOT NULL DEFAULT 0.0,
  vertical_match_confidence NUMERIC(5,4) NOT NULL DEFAULT 0.0,
  quality_score NUMERIC(5,2) NOT NULL DEFAULT 0.0,
  verification_status media_lifecycle_status NOT NULL DEFAULT 'imported',
  moderation_status moderation_status NOT NULL DEFAULT 'pending',
  lock_status media_lock_status NOT NULL DEFAULT 'unlocked',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE media_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  detected_media_kind TEXT,
  detected_labels TEXT[] NOT NULL DEFAULT '{}',
  entity_match_confidence NUMERIC(5,4) NOT NULL DEFAULT 0.0,
  vertical_match_confidence NUMERIC(5,4) NOT NULL DEFAULT 0.0,
  is_stock BOOLEAN NOT NULL DEFAULT false,
  has_watermark BOOLEAN NOT NULL DEFAULT false,
  is_duplicate BOOLEAN NOT NULL DEFAULT false,
  duplicate_of_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  quality_score NUMERIC(5,2) NOT NULL DEFAULT 0.0,
  analysis_version TEXT NOT NULL,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE media_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE UNIQUE,
  perceptual_hash TEXT,
  url_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- QUARANTINE + REVIEW TABLES
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE quarantine_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES canonical_entities(id) ON DELETE SET NULL,
  media_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  reason quarantine_reason NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  failed_gates validation_gate_id[] NOT NULL DEFAULT '{}',
  confidence_score NUMERIC(5,4),
  quarantined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolution TEXT CHECK (resolution IN ('approved', 'rejected', 'reclassified')),
  reviewer_id UUID,
  CHECK (entity_id IS NOT NULL OR media_asset_id IS NOT NULL)
);

CREATE TABLE review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES canonical_entities(id) ON DELETE SET NULL,
  media_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  type review_item_type NOT NULL,
  priority review_priority NOT NULL DEFAULT 'medium',
  status review_status NOT NULL DEFAULT 'pending',
  assigned_to UUID,
  raw_source JSONB,
  normalized_fields JSONB,
  canonical_suggestions JSONB NOT NULL DEFAULT '[]',
  rejected_media TEXT[] NOT NULL DEFAULT '{}',
  approved_media TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE reclassification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES canonical_entities(id) ON DELETE CASCADE,
  old_canonical_path TEXT NOT NULL,
  new_canonical_path TEXT,
  requested_by UUID NOT NULL,
  reason TEXT NOT NULL,
  status reclassification_status NOT NULL DEFAULT 'requested',
  validation_results JSONB NOT NULL DEFAULT '[]',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

-- ═══════════════════════════════════════════════════════════════════
-- JOBS + OPERATIONS TABLES
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE pipeline_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN (
    'import', 'normalize', 'classify', 'validate', 'publish',
    'media_analyze', 'duplicate_check', 'quarantine', 'reclassify'
  )),
  entity_id UUID REFERENCES canonical_entities(id) ON DELETE SET NULL,
  media_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  status job_status NOT NULL DEFAULT 'pending',
  input_source TEXT NOT NULL DEFAULT '',
  logic_version TEXT NOT NULL DEFAULT '',
  result JSONB,
  failure_reason TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID,
  media_asset_id UUID,
  action audit_action NOT NULL,
  actor_id UUID,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('system', 'user', 'worker', 'admin')),
  before_state JSONB,
  after_state JSONB,
  reason TEXT,
  mapper_version TEXT,
  validator_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX idx_raw_entities_source ON raw_entities(source_type, source_id);
CREATE INDEX idx_raw_entities_status ON raw_entities(status);
CREATE INDEX idx_normalized_entities_raw ON normalized_entities(raw_entity_id);
CREATE INDEX idx_canonical_entities_vertical ON canonical_entities(vertical);
CREATE INDEX idx_canonical_entities_path ON canonical_entities(canonical_path);
CREATE INDEX idx_canonical_entities_status ON canonical_entities(validation_status, publish_status);
CREATE INDEX idx_canonical_entities_confidence ON canonical_entities(confidence_band);
CREATE INDEX idx_canonical_entities_geo ON canonical_entities(lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX idx_entity_validation_entity ON entity_validation_results(canonical_entity_id);
CREATE INDEX idx_entity_publish_status ON entity_publish_states(status);
CREATE INDEX idx_media_assets_entity ON media_assets(entity_id);
CREATE INDEX idx_media_assets_status ON media_assets(verification_status);
CREATE INDEX idx_media_assets_primary ON media_assets(entity_id, is_primary) WHERE is_primary = true;
CREATE INDEX idx_media_fingerprints_hash ON media_fingerprints(url_hash);
CREATE INDEX idx_quarantine_entity ON quarantine_queue(entity_id) WHERE resolved_at IS NULL;
CREATE INDEX idx_quarantine_media ON quarantine_queue(media_asset_id) WHERE resolved_at IS NULL;
CREATE INDEX idx_review_queue_status ON review_queue(status, priority);
CREATE INDEX idx_reclassification_entity ON reclassification_requests(entity_id);
CREATE INDEX idx_pipeline_jobs_status ON pipeline_jobs(status, type);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_media ON audit_logs(media_asset_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at);
CREATE INDEX idx_canonical_aliases_alias ON canonical_aliases(alias);

-- ═══════════════════════════════════════════════════════════════════
-- VIEWS
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public_published_entities AS
SELECT ce.*
FROM canonical_entities ce
JOIN entity_publish_states eps ON eps.canonical_entity_id = ce.id
WHERE eps.status = 'published'
  AND ce.validation_status = 'approved'
  AND ce.publish_status = 'published'
  AND ce.confidence_band IN ('high', 'medium')
  AND NOT EXISTS (
    SELECT 1 FROM quarantine_queue qq
    WHERE qq.entity_id = ce.id AND qq.resolved_at IS NULL
  );

CREATE OR REPLACE VIEW quarantined_entities AS
SELECT ce.*, qq.reason, qq.details as quarantine_details,
       qq.failed_gates, qq.quarantined_at
FROM canonical_entities ce
JOIN quarantine_queue qq ON qq.entity_id = ce.id
WHERE qq.resolved_at IS NULL;

CREATE OR REPLACE VIEW validation_dashboard AS
SELECT
  ce.id,
  ce.name,
  ce.vertical,
  ce.canonical_path,
  ce.confidence_score,
  ce.confidence_band,
  ce.validation_status,
  ce.publish_status,
  ce.review_required,
  eps.status as publish_state,
  eps.locks,
  (SELECT count(*) FROM entity_validation_results evr
   WHERE evr.canonical_entity_id = ce.id AND evr.result = 'fail') as failed_gates,
  (SELECT count(*) FROM media_assets ma
   WHERE ma.entity_id = ce.id) as media_count,
  (SELECT count(*) FROM media_assets ma
   WHERE ma.entity_id = ce.id AND ma.is_primary = true) as primary_media_count
FROM canonical_entities ce
LEFT JOIN entity_publish_states eps ON eps.canonical_entity_id = ce.id;

-- ═══════════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE raw_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE normalized_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarantine_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published entities" ON canonical_entities
  FOR SELECT USING (
    publish_status = 'published'
    AND validation_status = 'approved'
    AND confidence_band IN ('high', 'medium')
  );

CREATE POLICY "Public can read approved media" ON media_assets
  FOR SELECT USING (
    verification_status IN ('approved', 'primary_locked')
    AND moderation_status = 'approved'
  );

CREATE POLICY "Service role full access raw_entities" ON raw_entities
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access normalized_entities" ON normalized_entities
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access canonical_entities" ON canonical_entities
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access media_assets" ON media_assets
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access quarantine_queue" ON quarantine_queue
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access review_queue" ON review_queue
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access audit_logs" ON audit_logs
  FOR ALL USING (auth.role() = 'service_role');
