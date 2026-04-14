-- Performance & Scalability: Optimized PostgreSQL Indexes
-- This migration creates indexes for the most frequent query patterns:
-- 1. B-tree indexes for user_id, created_at, status lookups
-- 2. GIN indexes for full-text search
-- 3. Composite indexes for common filter combinations

-- ═══════════════════════════════════════════════════════════════
--  LISTINGS / MARKETPLACE
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_listings_user_id
  ON listings (user_id);

CREATE INDEX IF NOT EXISTS idx_listings_status_created
  ON listings (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listings_category_city
  ON listings (category, city);

CREATE INDEX IF NOT EXISTS idx_listings_city_status
  ON listings (city, status)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_listings_search_gin
  ON listings USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

CREATE INDEX IF NOT EXISTS idx_listings_updated_at
  ON listings (updated_at DESC);

-- ═══════════════════════════════════════════════════════════════
--  PROPERTIES
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_properties_owner_id
  ON properties (owner_id);

CREATE INDEX IF NOT EXISTS idx_properties_status
  ON properties (status)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_properties_city_type
  ON properties (city, property_type);

CREATE INDEX IF NOT EXISTS idx_properties_search_gin
  ON properties USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(address, '') || ' ' || coalesce(city, '')));

-- ═══════════════════════════════════════════════════════════════
--  TRANSACTIONS / PAYMENTS
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_transactions_user_date
  ON transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_status
  ON transactions (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_type_user
  ON transactions (transaction_type, user_id);

CREATE INDEX IF NOT EXISTS idx_payments_order_id
  ON payments (order_id);

CREATE INDEX IF NOT EXISTS idx_payments_user_status
  ON payments (user_id, status);

-- ═══════════════════════════════════════════════════════════════
--  CONVERSATIONS / MESSAGES (ORBIT)
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_conversations_participant
  ON conversation_participants (user_id, joined_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_updated
  ON conversations (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
  ON chat_messages_v2 (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender
  ON chat_messages_v2 (sender_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_search_gin
  ON chat_messages_v2 USING gin (to_tsvector('english', coalesce(body, '')));

-- ═══════════════════════════════════════════════════════════════
--  ORDERS
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_orders_user_date
  ON orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status
  ON orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_merchant_status
  ON orders (merchant_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_driver
  ON orders (driver_id)
  WHERE driver_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
--  USERS / PROFILES
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON profiles (email);

CREATE INDEX IF NOT EXISTS idx_profiles_search_gin
  ON profiles USING gin (to_tsvector('english', coalesce(display_name, '') || ' ' || coalesce(email, '')));

CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON profiles (role)
  WHERE role IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
--  LEASES
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_leases_property_id
  ON leases (property_id);

CREATE INDEX IF NOT EXISTS idx_leases_tenant_id
  ON leases (tenant_id);

CREATE INDEX IF NOT EXISTS idx_leases_status_dates
  ON leases (status, start_date, end_date);

-- ═══════════════════════════════════════════════════════════════
--  BOOKINGS / SERVICES
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_bookings_user_date
  ON bookings (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_provider_status
  ON bookings (provider_id, status);

CREATE INDEX IF NOT EXISTS idx_bookings_date_range
  ON bookings (start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_service_providers_category
  ON service_providers (category, city);

CREATE INDEX IF NOT EXISTS idx_service_providers_search_gin
  ON service_providers USING gin (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- ═══════════════════════════════════════════════════════════════
--  REVIEWS
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_reviews_target
  ON reviews (target_id, target_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_author
  ON reviews (author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_rating
  ON reviews (rating)
  WHERE rating IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
--  NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications (user_id, read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_type
  ON notifications (notification_type, created_at DESC);
