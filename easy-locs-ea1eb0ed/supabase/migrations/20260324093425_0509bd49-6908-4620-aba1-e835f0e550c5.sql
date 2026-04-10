
-- ============================================================
-- Canonical Taxonomy Hierarchy + catalog_items extensions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.canonical_verticals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  emoji text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.canonical_verticals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read verticals" ON public.canonical_verticals FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.canonical_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id uuid NOT NULL REFERENCES public.canonical_verticals(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  emoji text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(vertical_id, key)
);
ALTER TABLE public.canonical_families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read families" ON public.canonical_families FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX idx_canonical_families_vertical ON public.canonical_families(vertical_id);

CREATE TABLE IF NOT EXISTS public.canonical_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.canonical_families(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  icon text,
  emoji text,
  image_url text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(family_id, key)
);
ALTER TABLE public.canonical_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read categories" ON public.canonical_categories FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX idx_canonical_categories_family ON public.canonical_categories(family_id);

CREATE TABLE IF NOT EXISTS public.canonical_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.canonical_categories(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(category_id, key)
);
ALTER TABLE public.canonical_subcategories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read subcategories" ON public.canonical_subcategories FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX idx_canonical_subcategories_category ON public.canonical_subcategories(category_id);

-- Extend catalog_items
ALTER TABLE public.catalog_items
  ADD COLUMN IF NOT EXISTS vertical_id uuid REFERENCES public.canonical_verticals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES public.canonical_families(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_ref_id uuid REFERENCES public.canonical_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subcategory_ref_id uuid REFERENCES public.canonical_subcategories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS data_quality_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visual_quality_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS search_quality_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxonomy_quality_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS readiness_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS packshot_image_url text,
  ADD COLUMN IF NOT EXISTS merchandising_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visibility_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freshness_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversion_score numeric DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_catalog_items_vertical_id ON public.catalog_items(vertical_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_family_id ON public.catalog_items(family_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_readiness ON public.catalog_items(readiness_score DESC);

-- Extend catalog_media
ALTER TABLE public.catalog_media
  ADD COLUMN IF NOT EXISTS background_removed boolean DEFAULT false;

-- ============================================================
-- Seed verticals
-- ============================================================
INSERT INTO public.canonical_verticals (key, label, emoji, sort_order) VALUES
  ('food', 'Food & Dining', '🍽️', 1),
  ('grocery', 'Grocery', '🛒', 2),
  ('shops', 'Shops & Retail', '🛍️', 3),
  ('services', 'Services', '🔧', 4),
  ('healthcare', 'Healthcare', '🏥', 5),
  ('property', 'Property', '🏠', 6),
  ('mobility', 'Mobility', '🚗', 7),
  ('experiences', 'Experiences', '🎭', 8)
ON CONFLICT (key) DO NOTHING;

-- Grocery families
INSERT INTO public.canonical_families (vertical_id, key, label, emoji, sort_order)
SELECT v.id, f.key, f.label, f.emoji, f.sort_order
FROM public.canonical_verticals v,
(VALUES
  ('fresh_produce', 'Fresh Produce', '🥬', 1),
  ('bakery', 'Bakery', '🥖', 2),
  ('dairy_eggs', 'Dairy & Eggs', '🥛', 3),
  ('meat_seafood', 'Meat & Seafood', '🥩', 4),
  ('beverages', 'Beverages', '🥤', 5),
  ('pantry', 'Pantry', '🫙', 6),
  ('frozen', 'Frozen', '🧊', 7),
  ('snacks_sweets', 'Snacks & Sweets', '🍫', 8)
) AS f(key, label, emoji, sort_order)
WHERE v.key = 'grocery'
ON CONFLICT (vertical_id, key) DO NOTHING;

-- Food families
INSERT INTO public.canonical_families (vertical_id, key, label, emoji, sort_order)
SELECT v.id, f.key, f.label, f.emoji, f.sort_order
FROM public.canonical_verticals v,
(VALUES
  ('restaurant', 'Restaurant', '🍴', 1),
  ('fast_food', 'Fast Food', '🍔', 2),
  ('cafe_coffee', 'Café & Coffee', '☕', 3),
  ('desserts', 'Desserts', '🍰', 4),
  ('drinks', 'Drinks', '🥤', 5)
) AS f(key, label, emoji, sort_order)
WHERE v.key = 'food'
ON CONFLICT (vertical_id, key) DO NOTHING;

-- Healthcare families
INSERT INTO public.canonical_families (vertical_id, key, label, emoji, sort_order)
SELECT v.id, f.key, f.label, f.emoji, f.sort_order
FROM public.canonical_verticals v,
(VALUES
  ('pharmacy', 'Pharmacy', '💊', 1),
  ('personal_care', 'Personal Care', '🧴', 2),
  ('wellness', 'Wellness', '🧘', 3)
) AS f(key, label, emoji, sort_order)
WHERE v.key = 'healthcare'
ON CONFLICT (vertical_id, key) DO NOTHING;

-- Shops families
INSERT INTO public.canonical_families (vertical_id, key, label, emoji, sort_order)
SELECT v.id, f.key, f.label, f.emoji, f.sort_order
FROM public.canonical_verticals v,
(VALUES
  ('electronics', 'Electronics', '📱', 1),
  ('fashion', 'Fashion', '👗', 2),
  ('home_garden', 'Home & Garden', '🏡', 3),
  ('beauty', 'Beauty', '💄', 4),
  ('pet', 'Pet', '🐾', 5),
  ('toys_kids', 'Toys & Kids', '🧸', 6)
) AS f(key, label, emoji, sort_order)
WHERE v.key = 'shops'
ON CONFLICT (vertical_id, key) DO NOTHING;

-- Categories: Fresh Produce
INSERT INTO public.canonical_categories (family_id, key, label, emoji, sort_order)
SELECT f.id, c.key, c.label, c.emoji, c.sort_order
FROM public.canonical_families f JOIN public.canonical_verticals v ON f.vertical_id = v.id AND v.key = 'grocery',
(VALUES ('fruits','Fruits','🍎',1),('vegetables','Vegetables','🥕',2),('herbs','Herbs','🌿',3),('salads','Salads','🥗',4),('mushrooms','Mushrooms','🍄',5)
) AS c(key, label, emoji, sort_order) WHERE f.key = 'fresh_produce' ON CONFLICT (family_id, key) DO NOTHING;

-- Categories: Bakery
INSERT INTO public.canonical_categories (family_id, key, label, emoji, sort_order)
SELECT f.id, c.key, c.label, c.emoji, c.sort_order
FROM public.canonical_families f JOIN public.canonical_verticals v ON f.vertical_id = v.id AND v.key = 'grocery',
(VALUES ('bread','Bread','🍞',1),('pastries','Pastries','🥐',2),('cakes','Cakes','🎂',3),('cookies_biscuits','Cookies & Biscuits','🍪',4)
) AS c(key, label, emoji, sort_order) WHERE f.key = 'bakery' ON CONFLICT (family_id, key) DO NOTHING;

-- Categories: Beverages
INSERT INTO public.canonical_categories (family_id, key, label, emoji, sort_order)
SELECT f.id, c.key, c.label, c.emoji, c.sort_order
FROM public.canonical_families f JOIN public.canonical_verticals v ON f.vertical_id = v.id AND v.key = 'grocery',
(VALUES ('water','Water','💧',1),('juice','Juice','🧃',2),('soda','Soda & Soft Drinks','🥤',3),('tea','Tea','🍵',4),('coffee','Coffee','☕',5),('energy_drinks','Energy Drinks','⚡',6)
) AS c(key, label, emoji, sort_order) WHERE f.key = 'beverages' ON CONFLICT (family_id, key) DO NOTHING;

-- Categories: Dairy & Eggs
INSERT INTO public.canonical_categories (family_id, key, label, emoji, sort_order)
SELECT f.id, c.key, c.label, c.emoji, c.sort_order
FROM public.canonical_families f JOIN public.canonical_verticals v ON f.vertical_id = v.id AND v.key = 'grocery',
(VALUES ('milk','Milk','🥛',1),('cheese','Cheese','🧀',2),('yogurt','Yogurt','🥣',3),('butter','Butter & Cream','🧈',4),('eggs','Eggs','🥚',5)
) AS c(key, label, emoji, sort_order) WHERE f.key = 'dairy_eggs' ON CONFLICT (family_id, key) DO NOTHING;

-- Categories: Pantry
INSERT INTO public.canonical_categories (family_id, key, label, emoji, sort_order)
SELECT f.id, c.key, c.label, c.emoji, c.sort_order
FROM public.canonical_families f JOIN public.canonical_verticals v ON f.vertical_id = v.id AND v.key = 'grocery',
(VALUES ('rice','Rice','🍚',1),('pasta','Pasta','🍝',2),('flour','Flour','🌾',3),('oil','Oil & Vinegar','🫒',4),('sugar','Sugar & Sweeteners','🍯',5),('spices','Spices & Seasonings','🌶️',6),('sauces','Sauces & Condiments','🥫',7),('canned','Canned Goods','🥫',8)
) AS c(key, label, emoji, sort_order) WHERE f.key = 'pantry' ON CONFLICT (family_id, key) DO NOTHING;

-- Categories: Snacks & Sweets
INSERT INTO public.canonical_categories (family_id, key, label, emoji, sort_order)
SELECT f.id, c.key, c.label, c.emoji, c.sort_order
FROM public.canonical_families f JOIN public.canonical_verticals v ON f.vertical_id = v.id AND v.key = 'grocery',
(VALUES ('chocolate','Chocolate','🍫',1),('chips','Chips & Crisps','🥔',2),('candy','Candy','🍬',3),('nuts_dried_fruits','Nuts & Dried Fruits','🥜',4)
) AS c(key, label, emoji, sort_order) WHERE f.key = 'snacks_sweets' ON CONFLICT (family_id, key) DO NOTHING;

-- Categories: Healthcare / Pharmacy
INSERT INTO public.canonical_categories (family_id, key, label, emoji, sort_order)
SELECT f.id, c.key, c.label, c.emoji, c.sort_order
FROM public.canonical_families f JOIN public.canonical_verticals v ON f.vertical_id = v.id AND v.key = 'healthcare',
(VALUES ('pain_relief','Pain Relief','💊',1),('vitamins','Vitamins & Supplements','🧬',2),('cold_flu','Cold & Flu','🤧',3),('first_aid','First Aid','🩹',4),('digestive','Digestive Health','🫃',5)
) AS c(key, label, emoji, sort_order) WHERE f.key = 'pharmacy' ON CONFLICT (family_id, key) DO NOTHING;

-- Categories: Personal Care
INSERT INTO public.canonical_categories (family_id, key, label, emoji, sort_order)
SELECT f.id, c.key, c.label, c.emoji, c.sort_order
FROM public.canonical_families f JOIN public.canonical_verticals v ON f.vertical_id = v.id AND v.key = 'healthcare',
(VALUES ('skincare','Skincare','🧴',1),('hygiene','Hygiene','🧼',2),('haircare','Haircare','💇',3),('oral_care','Oral Care','🪥',4)
) AS c(key, label, emoji, sort_order) WHERE f.key = 'personal_care' ON CONFLICT (family_id, key) DO NOTHING;

-- Subcategories: Bread
INSERT INTO public.canonical_subcategories (category_id, key, label, sort_order)
SELECT c.id, s.key, s.label, s.sort_order
FROM public.canonical_categories c JOIN public.canonical_families f ON c.family_id = f.id JOIN public.canonical_verticals v ON f.vertical_id = v.id AND v.key = 'grocery',
(VALUES ('baguette','Baguette',1),('sourdough','Sourdough',2),('whole_wheat','Whole Wheat',3),('flatbread','Flatbread',4),('rye','Rye Bread',5),('buns','Buns & Rolls',6),('pita','Pita',7)
) AS s(key, label, sort_order) WHERE f.key = 'bakery' AND c.key = 'bread' ON CONFLICT (category_id, key) DO NOTHING;

-- Subcategories: Pastries
INSERT INTO public.canonical_subcategories (category_id, key, label, sort_order)
SELECT c.id, s.key, s.label, s.sort_order
FROM public.canonical_categories c JOIN public.canonical_families f ON c.family_id = f.id JOIN public.canonical_verticals v ON f.vertical_id = v.id AND v.key = 'grocery',
(VALUES ('croissant','Croissant',1),('danish','Danish',2),('muffins','Muffins',3),('brioche','Brioche',4),('eclair','Éclair',5),('pain_au_chocolat','Pain au Chocolat',6)
) AS s(key, label, sort_order) WHERE f.key = 'bakery' AND c.key = 'pastries' ON CONFLICT (category_id, key) DO NOTHING;

-- Subcategories: Fruits
INSERT INTO public.canonical_subcategories (category_id, key, label, sort_order)
SELECT c.id, s.key, s.label, s.sort_order
FROM public.canonical_categories c JOIN public.canonical_families f ON c.family_id = f.id JOIN public.canonical_verticals v ON f.vertical_id = v.id AND v.key = 'grocery',
(VALUES ('apple','Apple',1),('banana','Banana',2),('orange','Orange',3),('mango','Mango',4),('strawberry','Strawberry',5),('grapes','Grapes',6),('watermelon','Watermelon',7),('avocado','Avocado',8),('dates','Dates',9),('lemon_lime','Lemon & Lime',10)
) AS s(key, label, sort_order) WHERE f.key = 'fresh_produce' AND c.key = 'fruits' ON CONFLICT (category_id, key) DO NOTHING;

-- Subcategories: Vegetables
INSERT INTO public.canonical_subcategories (category_id, key, label, sort_order)
SELECT c.id, s.key, s.label, s.sort_order
FROM public.canonical_categories c JOIN public.canonical_families f ON c.family_id = f.id JOIN public.canonical_verticals v ON f.vertical_id = v.id AND v.key = 'grocery',
(VALUES ('tomato','Tomato',1),('potato','Potato',2),('onion','Onion',3),('carrot','Carrot',4),('cucumber','Cucumber',5),('pepper','Pepper',6),('eggplant','Eggplant / Aubergine',7),('zucchini','Zucchini / Courgette',8),('lettuce','Lettuce',9),('spinach','Spinach',10)
) AS s(key, label, sort_order) WHERE f.key = 'fresh_produce' AND c.key = 'vegetables' ON CONFLICT (category_id, key) DO NOTHING;

-- ============================================================
-- SQL Functions
-- ============================================================

-- Rebuild product search index
CREATE OR REPLACE FUNCTION public.rebuild_product_search_index(p_product_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_item record; v_tags text[]; v_synonyms jsonb; v_searchable text; v_tsvec tsvector;
BEGIN
  SELECT * INTO v_item FROM catalog_items WHERE id = p_product_id;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT array_agg(t.key) INTO v_tags FROM catalog_product_tags pt JOIN canonical_tags t ON pt.tag_id = t.id WHERE pt.product_id = p_product_id;
  SELECT coalesce(jsonb_agg(jsonb_build_object('source', cs.source_term, 'normalized', cs.normalized_term)), '[]'::jsonb) INTO v_synonyms
  FROM canonical_synonyms cs WHERE cs.active = true AND (cs.normalized_term = lower(v_item.title) OR cs.source_term = lower(v_item.title) OR cs.normalized_term = v_item.canonical_category OR cs.normalized_term = v_item.canonical_subcategory);
  v_searchable := coalesce(v_item.title,'') || ' ' || coalesce(v_item.description,'') || ' ' || coalesce(v_item.brand_name,'') || ' ' || coalesce(v_item.canonical_category,'') || ' ' || coalesce(v_item.canonical_subcategory,'') || ' ' || coalesce(array_to_string(v_tags, ' '), '');
  v_tsvec := to_tsvector('simple', v_searchable);
  INSERT INTO product_search_index (product_id, entity_id, vertical, family, category, subcategory, searchable_text, searchable_plain, synonyms_json, tags_json, brand, quality_score, updated_at)
  VALUES (p_product_id, v_item.shop_id, v_item.canonical_vertical, v_item.canonical_family, v_item.canonical_category, v_item.canonical_subcategory, v_tsvec, v_searchable, v_synonyms, to_jsonb(coalesce(v_tags, '{}'::text[])), v_item.brand_name, v_item.quality_score, now())
  ON CONFLICT (product_id) DO UPDATE SET entity_id=EXCLUDED.entity_id, vertical=EXCLUDED.vertical, family=EXCLUDED.family, category=EXCLUDED.category, subcategory=EXCLUDED.subcategory, searchable_text=EXCLUDED.searchable_text, searchable_plain=EXCLUDED.searchable_plain, synonyms_json=EXCLUDED.synonyms_json, tags_json=EXCLUDED.tags_json, brand=EXCLUDED.brand, quality_score=EXCLUDED.quality_score, updated_at=now();
END; $$;

-- Compute product quality scores
CREATE OR REPLACE FUNCTION public.compute_product_quality_scores(p_product_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_data_q numeric:=0; v_visual_q numeric:=0; v_search_q numeric:=0; v_taxonomy_q numeric:=0; v_readiness numeric:=0; v_item record; v_img_count integer; v_variant_count integer; v_attr_count integer;
BEGIN
  SELECT * INTO v_item FROM catalog_items WHERE id = p_product_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_item.title IS NOT NULL AND length(v_item.title) > 2 THEN v_data_q := v_data_q + 20; END IF;
  IF v_item.description IS NOT NULL AND length(v_item.description) > 10 THEN v_data_q := v_data_q + 15; END IF;
  IF v_item.price > 0 THEN v_data_q := v_data_q + 20; END IF;
  IF v_item.brand_name IS NOT NULL THEN v_data_q := v_data_q + 10; END IF;
  IF v_item.sku IS NOT NULL THEN v_data_q := v_data_q + 5; END IF;
  IF v_item.origin_country IS NOT NULL THEN v_data_q := v_data_q + 5; END IF;
  IF v_item.short_description IS NOT NULL THEN v_data_q := v_data_q + 5; END IF;
  IF v_item.default_unit IS NOT NULL AND v_item.default_unit != 'piece' THEN v_data_q := v_data_q + 5; END IF;
  SELECT count(*) INTO v_variant_count FROM catalog_variants WHERE item_id = p_product_id;
  IF v_variant_count > 0 THEN v_data_q := v_data_q + 10; END IF;
  SELECT count(*) INTO v_attr_count FROM catalog_product_attributes WHERE global_product_id = p_product_id;
  IF v_attr_count > 0 THEN v_data_q := v_data_q + 5; END IF;
  SELECT count(*) INTO v_img_count FROM catalog_media WHERE product_id = p_product_id AND active = true;
  v_visual_q := least(v_img_count * 20, 60);
  IF v_item.cover_image_url IS NOT NULL THEN v_visual_q := v_visual_q + 20; END IF;
  IF v_item.photo_url IS NOT NULL THEN v_visual_q := v_visual_q + 20; END IF;
  IF v_item.searchable_text IS NOT NULL THEN v_search_q := v_search_q + 30; END IF;
  IF v_item.canonical_category IS NOT NULL THEN v_search_q := v_search_q + 20; END IF;
  IF v_item.canonical_subcategory IS NOT NULL THEN v_search_q := v_search_q + 20; END IF;
  IF v_item.canonical_vertical IS NOT NULL THEN v_search_q := v_search_q + 15; END IF;
  IF array_length(v_item.tags, 1) > 0 THEN v_search_q := v_search_q + 15; END IF;
  IF v_item.canonical_vertical IS NOT NULL THEN v_taxonomy_q := v_taxonomy_q + 25; END IF;
  IF v_item.canonical_family IS NOT NULL THEN v_taxonomy_q := v_taxonomy_q + 25; END IF;
  IF v_item.canonical_category IS NOT NULL THEN v_taxonomy_q := v_taxonomy_q + 25; END IF;
  IF v_item.canonical_subcategory IS NOT NULL THEN v_taxonomy_q := v_taxonomy_q + 25; END IF;
  v_readiness := (v_data_q * 0.3 + v_visual_q * 0.25 + v_search_q * 0.2 + v_taxonomy_q * 0.25);
  UPDATE catalog_items SET data_quality_score=least(v_data_q,100), visual_quality_score=least(v_visual_q,100), search_quality_score=least(v_search_q,100), taxonomy_quality_score=least(v_taxonomy_q,100), readiness_score=least(v_readiness,100), quality_score=least(v_readiness,100), completeness_score=least(v_data_q,100) WHERE id = p_product_id;
END; $$;

-- Search V2 with synonyms
CREATE OR REPLACE FUNCTION public.search_global_products_v2(q text, p_country text DEFAULT NULL, p_city text DEFAULT NULL, p_vertical text DEFAULT NULL, p_category text DEFAULT NULL, limit_count integer DEFAULT 20)
RETURNS TABLE(product_id uuid, entity_id uuid, title text, description text, price numeric, currency text, photo_url text, vertical text, category text, subcategory text, brand text, rank_score numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_query tsquery; v_normalized text; v_synonym_term text;
BEGIN
  SELECT cs.normalized_term INTO v_synonym_term FROM canonical_synonyms cs WHERE cs.active = true AND lower(cs.source_term) = lower(trim(q)) LIMIT 1;
  v_normalized := coalesce(v_synonym_term, trim(q));
  v_query := plainto_tsquery('simple', v_normalized);
  RETURN QUERY
  SELECT ci.id, ci.shop_id, ci.title, ci.description, ci.price, ci.currency, ci.photo_url, ci.canonical_vertical, ci.canonical_category, ci.canonical_subcategory, ci.brand_name,
    (ts_rank(psi.searchable_text, v_query) * 10 + coalesce(psi.final_rank_score, 0) * 0.5 + coalesce(ci.quality_score, 0) * 0.01)::numeric
  FROM product_search_index psi JOIN catalog_items ci ON ci.id = psi.product_id
  WHERE psi.searchable_text @@ v_query AND ci.available = true
    AND (p_country IS NULL OR psi.country = p_country)
    AND (p_city IS NULL OR psi.city = p_city)
    AND (p_vertical IS NULL OR psi.vertical = p_vertical)
    AND (p_category IS NULL OR psi.category = p_category)
  ORDER BY rank_score DESC LIMIT limit_count;
END; $$;
