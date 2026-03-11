
-- Layer 3.2: Performance indexes on hot query paths

-- Properties
CREATE INDEX IF NOT EXISTS idx_properties_org_id ON public.properties (org_id);
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties (user_id);
CREATE INDEX IF NOT EXISTS idx_properties_country ON public.properties (country);
CREATE INDEX IF NOT EXISTS idx_properties_city ON public.properties (city);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON public.properties (created_at DESC);

-- Tenants
CREATE INDEX IF NOT EXISTS idx_tenants_org_id ON public.tenants (org_id);
CREATE INDEX IF NOT EXISTS idx_tenants_property_id ON public.tenants (property_id);

-- Leases
CREATE INDEX IF NOT EXISTS idx_leases_org_id ON public.leases (org_id);
CREATE INDEX IF NOT EXISTS idx_leases_property_id ON public.leases (property_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id ON public.leases (tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_created_at ON public.leases (created_at DESC);

-- Rent Calls
CREATE INDEX IF NOT EXISTS idx_rent_calls_org_id ON public.rent_calls (org_id);
CREATE INDEX IF NOT EXISTS idx_rent_calls_tenant_id ON public.rent_calls (tenant_id);
CREATE INDEX IF NOT EXISTS idx_rent_calls_property_id ON public.rent_calls (property_id);

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_org_id ON public.documents (org_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents (user_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents (created_at DESC);

-- Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_org_id ON public.expenses (org_id);
CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON public.expenses (property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses (user_id);

-- Interventions
CREATE INDEX IF NOT EXISTS idx_interventions_org_id ON public.interventions (org_id);
CREATE INDEX IF NOT EXISTS idx_interventions_property_id ON public.interventions (property_id);
CREATE INDEX IF NOT EXISTS idx_interventions_tenant_id ON public.interventions (tenant_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org_id ON public.notifications (org_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications (read);

-- Messages (no user_id column)
CREATE INDEX IF NOT EXISTS idx_messages_org_id ON public.messages (org_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages (created_at DESC);

-- Concierge Services
CREATE INDEX IF NOT EXISTS idx_concierge_services_org_id ON public.concierge_services (org_id);
CREATE INDEX IF NOT EXISTS idx_concierge_services_category ON public.concierge_services (category);
CREATE INDEX IF NOT EXISTS idx_concierge_services_city ON public.concierge_services (city);
CREATE INDEX IF NOT EXISTS idx_concierge_services_country ON public.concierge_services (country);
CREATE INDEX IF NOT EXISTS idx_concierge_services_active ON public.concierge_services (active);

-- Concierge Orders
CREATE INDEX IF NOT EXISTS idx_concierge_orders_org_id ON public.concierge_orders (org_id);
CREATE INDEX IF NOT EXISTS idx_concierge_orders_service_id ON public.concierge_orders (service_id);
CREATE INDEX IF NOT EXISTS idx_concierge_orders_created_at ON public.concierge_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_concierge_orders_status ON public.concierge_orders (status);

-- Marketplace Services
CREATE INDEX IF NOT EXISTS idx_marketplace_services_org_id ON public.marketplace_services (org_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_services_category ON public.marketplace_services (category);
CREATE INDEX IF NOT EXISTS idx_marketplace_services_city ON public.marketplace_services (city);
CREATE INDEX IF NOT EXISTS idx_marketplace_services_country ON public.marketplace_services (country);
CREATE INDEX IF NOT EXISTS idx_marketplace_services_active ON public.marketplace_services (active);

-- Marketplace Bookings
CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_org_id ON public.marketplace_bookings (org_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_service_id ON public.marketplace_bookings (service_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_created_at ON public.marketplace_bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_status ON public.marketplace_bookings (status);

-- Activities
CREATE INDEX IF NOT EXISTS idx_activities_org_id ON public.activities (org_id);
CREATE INDEX IF NOT EXISTS idx_activities_category ON public.activities (category);
CREATE INDEX IF NOT EXISTS idx_activities_city ON public.activities (city);
CREATE INDEX IF NOT EXISTS idx_activities_country ON public.activities (country);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities (user_id);

-- Booking Requests
CREATE INDEX IF NOT EXISTS idx_booking_requests_org_id ON public.booking_requests (org_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_property_id ON public.booking_requests (property_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_listing_id ON public.booking_requests (listing_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_created_at ON public.booking_requests (created_at DESC);

-- Public Listings
CREATE INDEX IF NOT EXISTS idx_public_listings_org_id ON public.public_listings (org_id);
CREATE INDEX IF NOT EXISTS idx_public_listings_property_id ON public.public_listings (property_id);
CREATE INDEX IF NOT EXISTS idx_public_listings_active ON public.public_listings (active);

-- Real Estate Listings
CREATE INDEX IF NOT EXISTS idx_real_estate_listings_org_id ON public.real_estate_listings (org_id);
CREATE INDEX IF NOT EXISTS idx_real_estate_listings_country ON public.real_estate_listings (country);
CREATE INDEX IF NOT EXISTS idx_real_estate_listings_city ON public.real_estate_listings (city);
CREATE INDEX IF NOT EXISTS idx_real_estate_listings_listing_type ON public.real_estate_listings (listing_type);
CREATE INDEX IF NOT EXISTS idx_real_estate_listings_status ON public.real_estate_listings (status);
CREATE INDEX IF NOT EXISTS idx_real_estate_listings_slug ON public.real_estate_listings (slug);
CREATE INDEX IF NOT EXISTS idx_real_estate_listings_created_at ON public.real_estate_listings (created_at DESC);

-- Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON public.audit_logs (org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- Org Members
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.org_members (user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.org_members (org_id);

-- Candidates
CREATE INDEX IF NOT EXISTS idx_candidates_org_id ON public.candidates (org_id);
CREATE INDEX IF NOT EXISTS idx_candidates_property_id ON public.candidates (property_id);

-- Buildings
CREATE INDEX IF NOT EXISTS idx_buildings_org_id ON public.buildings (org_id);

-- Booking Tasks
CREATE INDEX IF NOT EXISTS idx_booking_tasks_org_id ON public.booking_tasks (org_id);
CREATE INDEX IF NOT EXISTS idx_booking_tasks_property_id ON public.booking_tasks (property_id);
CREATE INDEX IF NOT EXISTS idx_booking_tasks_booking_id ON public.booking_tasks (booking_id);

-- Composite indexes for common filter combos
CREATE INDEX IF NOT EXISTS idx_concierge_services_active_country_city ON public.concierge_services (active, country, city);
CREATE INDEX IF NOT EXISTS idx_marketplace_services_active_country_city ON public.marketplace_services (active, country, city);
CREATE INDEX IF NOT EXISTS idx_real_estate_active_country_city ON public.real_estate_listings (status, country, city);
CREATE INDEX IF NOT EXISTS idx_activities_country_city_cat ON public.activities (country, city, category);
