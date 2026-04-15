-- C2C Classifieds — Extended schema for Annonces vertical
-- Extends existing marketplace_services with C2C-specific columns and adds supporting tables

-- 1. Price type enum
DO $$ BEGIN
  CREATE TYPE c2c_price_type AS ENUM ('fixed', 'negotiable', 'free', 'exchange', 'on_demand');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Delivery option enum
DO $$ BEGIN
  CREATE TYPE c2c_delivery_option AS ENUM ('hand', 'ship', 'both');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Extend marketplace_services with C2C columns (safe ADD IF NOT EXISTS pattern)
ALTER TABLE marketplace_services ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE marketplace_services ADD COLUMN IF NOT EXISTS custom_attributes JSONB DEFAULT '{}';
ALTER TABLE marketplace_services ADD COLUMN IF NOT EXISTS price_type TEXT DEFAULT 'fixed';
ALTER TABLE marketplace_services ADD COLUMN IF NOT EXISTS delivery_option TEXT DEFAULT 'hand';
ALTER TABLE marketplace_services ADD COLUMN IF NOT EXISTS quartier TEXT;
ALTER TABLE marketplace_services ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE marketplace_services ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE marketplace_services ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE marketplace_services ADD COLUMN IF NOT EXISTS favorite_count INTEGER DEFAULT 0;

-- Spatial index for geo queries
CREATE INDEX IF NOT EXISTS idx_c2c_listings_geo ON marketplace_services (lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_c2c_listings_slug ON marketplace_services (slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_c2c_listings_subcategory ON marketplace_services (subcategory) WHERE subcategory IS NOT NULL;

-- Full-text search index
ALTER TABLE marketplace_services ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;
CREATE INDEX IF NOT EXISTS idx_c2c_search_vector ON marketplace_services USING GIN(search_vector);

-- Trigger to auto-update search vector
CREATE OR REPLACE FUNCTION update_listing_search_vector() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('french',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.city, '') || ' ' ||
    coalesce(NEW.quartier, '') || ' ' ||
    coalesce(NEW.subcategory, '') || ' ' ||
    coalesce(NEW.brand, '') || ' ' ||
    coalesce(NEW.model, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_listing_search_vector ON marketplace_services;
CREATE TRIGGER trg_update_listing_search_vector
  BEFORE INSERT OR UPDATE OF title, description, city, quartier, subcategory, brand, model
  ON marketplace_services
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_search_vector();

-- 4. C2C Offers table
CREATE TABLE IF NOT EXISTS c2c_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES marketplace_services(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'confirmed', 'declined', 'countered', 'expired', 'cancelled')),
  counter_amount NUMERIC(12, 2),
  counter_message TEXT,
  expires_at TIMESTAMPTZ,
  deal_id UUID,
  conversation_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_c2c_offers_listing ON c2c_offers (listing_id);
CREATE INDEX IF NOT EXISTS idx_c2c_offers_buyer ON c2c_offers (buyer_id);
CREATE INDEX IF NOT EXISTS idx_c2c_offers_seller ON c2c_offers (seller_id);

-- 5. C2C Reports table
CREATE TABLE IF NOT EXISTS c2c_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES marketplace_services(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('scam', 'inappropriate', 'duplicate', 'prohibited', 'other')),
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_c2c_reports_listing ON c2c_reports (listing_id);

-- 6. C2C Moderation Queue
CREATE TABLE IF NOT EXISTS c2c_moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES marketplace_services(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  flags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'cleared', 'removed')),
  reviewer_id UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_c2c_moderation_listing ON c2c_moderation_queue (listing_id);
CREATE INDEX IF NOT EXISTS idx_c2c_moderation_status ON c2c_moderation_queue (status) WHERE status = 'pending';

-- 7. C2C Reviews table
CREATE TABLE IF NOT EXISTS c2c_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES marketplace_services(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  offer_id UUID REFERENCES c2c_offers(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_c2c_reviews_seller ON c2c_reviews (seller_id);
CREATE INDEX IF NOT EXISTS idx_c2c_reviews_listing ON c2c_reviews (listing_id);

-- 8. RLS Policies
ALTER TABLE c2c_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE c2c_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE c2c_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE c2c_moderation_queue ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "c2c_offers_read" ON c2c_offers FOR SELECT USING (
    auth.uid() = buyer_id OR auth.uid() = seller_id
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "c2c_offers_insert" ON c2c_offers FOR INSERT WITH CHECK (
    auth.uid() = buyer_id
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "c2c_offers_buyer_update" ON c2c_offers FOR UPDATE USING (
    auth.uid() = buyer_id
  ) WITH CHECK (
    auth.uid() = buyer_id AND status IN ('cancelled')
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "c2c_offers_seller_update" ON c2c_offers FOR UPDATE USING (
    auth.uid() = seller_id
  ) WITH CHECK (
    auth.uid() = seller_id AND status IN ('accepted', 'declined', 'countered')
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "c2c_reports_insert" ON c2c_reports FOR INSERT WITH CHECK (
    auth.uid() = reporter_id
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "c2c_reviews_read" ON c2c_reviews FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "c2c_reviews_insert" ON c2c_reviews FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "c2c_moderation_queue_insert" ON c2c_moderation_queue FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "c2c_moderation_queue_read" ON c2c_moderation_queue FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM marketplace_services ms
      WHERE ms.id = c2c_moderation_queue.listing_id
        AND ms.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "c2c_moderation_queue_service_role_update" ON c2c_moderation_queue FOR UPDATE USING (
    (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
