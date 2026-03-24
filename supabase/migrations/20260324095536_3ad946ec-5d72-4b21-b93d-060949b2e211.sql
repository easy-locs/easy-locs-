
-- Coherence persistence: extend onboarding_shop_candidates with coherence scoring
ALTER TABLE IF EXISTS onboarding_shop_candidates
  ADD COLUMN IF NOT EXISTS coherence_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coherence_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS coherence_conflicts_json jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS coherence_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS coherence_quarantined boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS coherence_quarantine_reason text;

-- Extend merchant_onboarding_state with coherence fields
ALTER TABLE IF EXISTS merchant_onboarding_state
  ADD COLUMN IF NOT EXISTS coherence_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coherence_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS coherence_quarantined boolean DEFAULT false;

-- Extend storefront_pages with coherence gate
ALTER TABLE IF EXISTS storefront_pages
  ADD COLUMN IF NOT EXISTS coherence_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coherence_status text DEFAULT 'pending';

-- Extend seed_merchants with coherence gate  
ALTER TABLE IF EXISTS seed_merchants
  ADD COLUMN IF NOT EXISTS coherence_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coherence_status text DEFAULT 'pending';
