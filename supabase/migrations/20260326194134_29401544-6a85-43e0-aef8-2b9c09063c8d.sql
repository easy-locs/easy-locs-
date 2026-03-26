
-- Publish all storefronts that have valid data (latitude, name, vertical set)
-- so they become visible via RLS public SELECT policy
UPDATE storefront_pages
SET shop_visibility = 'public'
WHERE active = true
  AND shop_visibility = 'draft'
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND name IS NOT NULL
  AND vertical IS NOT NULL;
