-- 1. Add is_flagged to storefront_pages for governance alignment
ALTER TABLE storefront_pages ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false;

-- 2. Add subcategory-aware fallback images per subcategory for storefront_pages
-- Update storefronts with taxonomy-based banner_url where missing
UPDATE storefront_pages SET banner_url = CASE subcategory
  WHEN 'pizza' THEN 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80'
  WHEN 'burger' THEN 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80'
  WHEN 'sushi' THEN 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80'
  WHEN 'bakery' THEN 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80'
  WHEN 'cafe' THEN 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80'
  ELSE CASE vertical
    WHEN 'food' THEN 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80'
    WHEN 'grocery' THEN 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80'
    WHEN 'shops' THEN 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80'
    WHEN 'services' THEN 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80'
    WHEN 'property' THEN 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'
    ELSE 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80'
  END
END
WHERE banner_url IS NULL;

-- 3. Fix seed_merchants cover image diversity (replace duplicates with subcategory-specific images)
UPDATE seed_merchants SET cover_image = CASE subcategory
  WHEN 'burger' THEN 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80'
  WHEN 'sushi' THEN 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80'
  WHEN 'indian' THEN 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80'
  WHEN 'chinese' THEN 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80'
  WHEN 'shawarma' THEN 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&q=80'
  WHEN 'mexican' THEN 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80'
  WHEN 'pasta' THEN 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80'
  WHEN 'healthy' THEN 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80'
  WHEN 'breakfast' THEN 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80'
  WHEN 'desserts' THEN 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80'
  WHEN 'thai' THEN 'https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=800&q=80'
  WHEN 'lebanese' THEN 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&q=80'
  WHEN 'seafood' THEN 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=800&q=80'
  WHEN 'fried_chicken' THEN 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=800&q=80'
  WHEN 'italian' THEN 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80'
  WHEN 'japanese' THEN 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80'
  WHEN 'bakery' THEN 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80'
  WHEN 'cafe' THEN 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80'
  ELSE CASE category
    WHEN 'food' THEN 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80'
    WHEN 'grocery' THEN 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80'
    WHEN 'shops' THEN 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80'
    WHEN 'services' THEN 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80'
    WHEN 'property' THEN 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'
    WHEN 'healthcare' THEN 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80'
    WHEN 'mobility' THEN 'https://images.unsplash.com/photo-1449965408869-ebd13bc0c72a?w=800&q=80'
    WHEN 'experiences' THEN 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800&q=80'
    ELSE 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80'
  END
END
WHERE category = 'food';

-- Non-food seeds
UPDATE seed_merchants SET cover_image = CASE category
  WHEN 'grocery' THEN 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80'
  WHEN 'shops' THEN 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80'
  WHEN 'services' THEN 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80'
  WHEN 'property' THEN 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'
  WHEN 'healthcare' THEN 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80'
  WHEN 'mobility' THEN 'https://images.unsplash.com/photo-1449965408869-ebd13bc0c72a?w=800&q=80'
  WHEN 'experiences' THEN 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800&q=80'
  ELSE cover_image
END
WHERE category != 'food';

-- 4. Activate qualifying storefronts: slug + GPS + vertical + now has banner
UPDATE storefront_pages SET visibility_mode = 'ready'
WHERE visibility_mode = 'coming_soon'
  AND slug IS NOT NULL AND slug != ''
  AND latitude IS NOT NULL
  AND vertical IS NOT NULL
  AND banner_url IS NOT NULL
  AND route_status = 'valid';

-- 5. Ensure seed_merchants governance columns have defaults
UPDATE seed_merchants SET visibility_mode = 'coming_soon' WHERE visibility_mode IS NULL;
UPDATE seed_merchants SET route_status = 'valid' WHERE route_status IS NULL;