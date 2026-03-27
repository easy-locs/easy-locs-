
-- Add unique constraints for hotel pipeline upserts
CREATE UNIQUE INDEX IF NOT EXISTS ux_hotel_rooms_hotel_source ON hotel_rooms(hotel_id, source_room_id) WHERE source_room_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_hotel_rate_plans_room_source ON hotel_rate_plans(room_id, source_rate_id) WHERE source_rate_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_hotel_inventory_calendar_composite ON hotel_inventory_calendar(hotel_id, room_type_id, rate_plan_id, night_date);
CREATE UNIQUE INDEX IF NOT EXISTS ux_hotels_seed_merchant ON hotels(seed_merchant_id) WHERE seed_merchant_id IS NOT NULL;
