
-- Update delivery_kind constraint to support all canonical delivery kinds
ALTER TABLE category_fulfillment_rules DROP CONSTRAINT IF EXISTS category_fulfillment_rules_delivery_kind_check;
ALTER TABLE category_fulfillment_rules ADD CONSTRAINT category_fulfillment_rules_delivery_kind_check 
  CHECK (delivery_kind = ANY (ARRAY['none', 'taxi', 'food_delivery', 'grocery_delivery', 'parcel_delivery', 'platform_delivery', 'merchant_delivery', 'pickup_only', 'mobility_driver', 'hybrid']));
