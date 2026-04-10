
-- ═══════════════════════════════════════════════════════════
-- COMMERCE CANONICAL SYSTEM — Phase 1: Taxonomy & Units
-- ═══════════════════════════════════════════════════════════

-- 1. Canonical Unit Groups (weight, volume, quantity, food_service)
CREATE TABLE public.canonical_unit_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.canonical_unit_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read unit groups" ON public.canonical_unit_groups FOR SELECT TO anon, authenticated USING (true);

-- 2. Canonical Units
CREATE TABLE public.canonical_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.canonical_unit_groups(id) ON DELETE CASCADE NOT NULL,
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  symbol text NOT NULL,
  conversion_factor numeric DEFAULT 1,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.canonical_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read units" ON public.canonical_units FOR SELECT TO anon, authenticated USING (active = true);

-- 3. Canonical Tags (reusable across products/entities)
CREATE TABLE public.canonical_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  tag_type text NOT NULL DEFAULT 'general',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.canonical_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tags" ON public.canonical_tags FOR SELECT TO anon, authenticated USING (active = true);

-- 4. Canonical Attribute Definitions (filterable product attributes)
CREATE TABLE public.canonical_attribute_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical text,
  category text,
  subcategory text,
  key text NOT NULL,
  label text NOT NULL,
  value_type text NOT NULL DEFAULT 'text',
  unit_group_id uuid REFERENCES public.canonical_unit_groups(id),
  filterable boolean DEFAULT false,
  searchable boolean DEFAULT false,
  sortable boolean DEFAULT false,
  required boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(key, vertical)
);
ALTER TABLE public.canonical_attribute_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read attribute defs" ON public.canonical_attribute_definitions FOR SELECT TO anon, authenticated USING (active = true);

-- 5. Canonical Synonyms (search normalization)
CREATE TABLE public.canonical_synonyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language text NOT NULL DEFAULT 'en',
  source_term text NOT NULL,
  normalized_term text NOT NULL,
  category text,
  subcategory text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_synonyms_source ON public.canonical_synonyms(lower(source_term));
CREATE INDEX idx_synonyms_lang ON public.canonical_synonyms(language);
ALTER TABLE public.canonical_synonyms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read synonyms" ON public.canonical_synonyms FOR SELECT TO anon, authenticated USING (active = true);

-- ═══════════════════════════════════════════════════════════
-- Phase 2: Extend catalog_items with canonical commerce fields
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.catalog_items 
  ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS canonical_vertical text,
  ADD COLUMN IF NOT EXISTS canonical_family text,
  ADD COLUMN IF NOT EXISTS canonical_category text,
  ADD COLUMN IF NOT EXISTS canonical_subcategory text,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS default_unit text DEFAULT 'piece',
  ADD COLUMN IF NOT EXISTS origin_country text,
  ADD COLUMN IF NOT EXISTS tax_code text,
  ADD COLUMN IF NOT EXISTS searchable_text tsvector,
  ADD COLUMN IF NOT EXISTS quality_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completeness_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_catalog_items_vertical ON public.catalog_items(canonical_vertical);
CREATE INDEX IF NOT EXISTS idx_catalog_items_category ON public.catalog_items(canonical_category);
CREATE INDEX IF NOT EXISTS idx_catalog_items_search ON public.catalog_items USING gin(searchable_text);
CREATE INDEX IF NOT EXISTS idx_catalog_items_slug ON public.catalog_items(slug);
CREATE INDEX IF NOT EXISTS idx_catalog_items_quality ON public.catalog_items(quality_score DESC);

-- Extend catalog_variants with canonical fields
ALTER TABLE public.catalog_variants
  ADD COLUMN IF NOT EXISTS variant_label text,
  ADD COLUMN IF NOT EXISTS size text,
  ADD COLUMN IF NOT EXISTS weight numeric,
  ADD COLUMN IF NOT EXISTS volume numeric,
  ADD COLUMN IF NOT EXISTS pack_quantity integer,
  ADD COLUMN IF NOT EXISTS unit text DEFAULT 'piece',
  ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS compare_at_price numeric,
  ADD COLUMN IF NOT EXISTS cost_price numeric,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'AED',
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS in_stock boolean DEFAULT true;

-- ═══════════════════════════════════════════════════════════
-- Phase 3: Product Attributes & Tags (many-to-many)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.catalog_product_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.catalog_items(id) ON DELETE CASCADE NOT NULL,
  attribute_definition_id uuid REFERENCES public.canonical_attribute_definitions(id) ON DELETE CASCADE NOT NULL,
  value_text text,
  value_number numeric,
  value_bool boolean,
  value_json jsonb,
  UNIQUE(product_id, attribute_definition_id)
);
ALTER TABLE public.catalog_product_attributes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read product attrs" ON public.catalog_product_attributes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners manage product attrs" ON public.catalog_product_attributes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM catalog_items ci WHERE ci.id = catalog_product_attributes.product_id AND ci.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM catalog_items ci WHERE ci.id = catalog_product_attributes.product_id AND ci.user_id = auth.uid()));

CREATE TABLE public.catalog_product_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.catalog_items(id) ON DELETE CASCADE NOT NULL,
  tag_id uuid REFERENCES public.canonical_tags(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(product_id, tag_id)
);
ALTER TABLE public.catalog_product_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read product tags" ON public.catalog_product_tags FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners manage product tags" ON public.catalog_product_tags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM catalog_items ci WHERE ci.id = catalog_product_tags.product_id AND ci.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM catalog_items ci WHERE ci.id = catalog_product_tags.product_id AND ci.user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════
-- Phase 4: Media System (unified for entities + products)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.catalog_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid,
  product_id uuid REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.catalog_variants(id) ON DELETE CASCADE,
  media_type text NOT NULL DEFAULT 'gallery',
  url text NOT NULL,
  alt_text text,
  source_type text DEFAULT 'upload',
  width integer,
  height integer,
  sort_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  quality_score numeric,
  moderation_status text DEFAULT 'approved',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_catalog_media_product ON public.catalog_media(product_id);
CREATE INDEX idx_catalog_media_entity ON public.catalog_media(entity_id);
CREATE INDEX idx_catalog_media_type ON public.catalog_media(media_type);
ALTER TABLE public.catalog_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read media" ON public.catalog_media FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "Auth users manage media" ON public.catalog_media FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- Phase 5: Translations (multi-language support)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.catalog_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid,
  product_id uuid REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  language text NOT NULL,
  field_key text NOT NULL,
  translated_value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, language, field_key)
);
CREATE INDEX idx_translations_product ON public.catalog_translations(product_id, language);
CREATE INDEX idx_translations_entity ON public.catalog_translations(entity_id, language);
ALTER TABLE public.catalog_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read translations" ON public.catalog_translations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Auth manage translations" ON public.catalog_translations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- Phase 6: Product Search Index
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.product_search_index (
  product_id uuid PRIMARY KEY REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  entity_id uuid,
  vertical text,
  family text,
  category text,
  subcategory text,
  searchable_text tsvector,
  searchable_plain text,
  synonyms_json jsonb DEFAULT '[]',
  tags_json jsonb DEFAULT '[]',
  brand text,
  country text,
  city text,
  language text DEFAULT 'en',
  popularity_score numeric DEFAULT 0,
  freshness_score numeric DEFAULT 0,
  quality_score numeric DEFAULT 0,
  availability_score numeric DEFAULT 1,
  final_rank_score numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_psi_search ON public.product_search_index USING gin(searchable_text);
CREATE INDEX idx_psi_vertical ON public.product_search_index(vertical);
CREATE INDEX idx_psi_category ON public.product_search_index(category);
CREATE INDEX idx_psi_rank ON public.product_search_index(final_rank_score DESC);
CREATE INDEX idx_psi_city ON public.product_search_index(city);
ALTER TABLE public.product_search_index ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read search index" ON public.product_search_index FOR SELECT TO anon, authenticated USING (true);

-- ═══════════════════════════════════════════════════════════
-- Phase 7: Auto-update searchable_text trigger
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_catalog_searchable_text()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.searchable_text := to_tsvector('simple',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.short_description, '') || ' ' ||
    coalesce(NEW.brand_name, '') || ' ' ||
    coalesce(NEW.canonical_category, '') || ' ' ||
    coalesce(NEW.canonical_subcategory, '') || ' ' ||
    coalesce(NEW.canonical_vertical, '') || ' ' ||
    coalesce(array_to_string(NEW.tags, ' '), '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_catalog_searchable
  BEFORE INSERT OR UPDATE ON public.catalog_items
  FOR EACH ROW EXECUTE FUNCTION update_catalog_searchable_text();

-- ═══════════════════════════════════════════════════════════
-- Phase 8: Seed initial unit groups and units
-- ═══════════════════════════════════════════════════════════

INSERT INTO public.canonical_unit_groups (key, label) VALUES
  ('weight', 'Weight'),
  ('volume', 'Volume'),
  ('quantity', 'Quantity'),
  ('food_service', 'Food Service'),
  ('length', 'Length')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.canonical_units (group_id, key, label, symbol, conversion_factor) VALUES
  ((SELECT id FROM canonical_unit_groups WHERE key='weight'), 'g', 'Gram', 'g', 1),
  ((SELECT id FROM canonical_unit_groups WHERE key='weight'), 'kg', 'Kilogram', 'kg', 1000),
  ((SELECT id FROM canonical_unit_groups WHERE key='weight'), 'lb', 'Pound', 'lb', 453.592),
  ((SELECT id FROM canonical_unit_groups WHERE key='weight'), 'oz', 'Ounce', 'oz', 28.3495),
  ((SELECT id FROM canonical_unit_groups WHERE key='volume'), 'ml', 'Milliliter', 'ml', 1),
  ((SELECT id FROM canonical_unit_groups WHERE key='volume'), 'l', 'Liter', 'L', 1000),
  ((SELECT id FROM canonical_unit_groups WHERE key='volume'), 'cl', 'Centiliter', 'cl', 10),
  ((SELECT id FROM canonical_unit_groups WHERE key='volume'), 'fl_oz', 'Fluid Ounce', 'fl oz', 29.5735),
  ((SELECT id FROM canonical_unit_groups WHERE key='quantity'), 'piece', 'Piece', 'pc', 1),
  ((SELECT id FROM canonical_unit_groups WHERE key='quantity'), 'pack', 'Pack', 'pk', 1),
  ((SELECT id FROM canonical_unit_groups WHERE key='quantity'), 'box', 'Box', 'box', 1),
  ((SELECT id FROM canonical_unit_groups WHERE key='quantity'), 'bottle', 'Bottle', 'btl', 1),
  ((SELECT id FROM canonical_unit_groups WHERE key='quantity'), 'can', 'Can', 'can', 1),
  ((SELECT id FROM canonical_unit_groups WHERE key='quantity'), 'tray', 'Tray', 'tray', 1),
  ((SELECT id FROM canonical_unit_groups WHERE key='quantity'), 'bag', 'Bag', 'bag', 1),
  ((SELECT id FROM canonical_unit_groups WHERE key='quantity'), 'dozen', 'Dozen', 'dz', 12),
  ((SELECT id FROM canonical_unit_groups WHERE key='food_service'), 'portion', 'Portion', 'portion', 1),
  ((SELECT id FROM canonical_unit_groups WHERE key='food_service'), 'meal', 'Meal', 'meal', 1),
  ((SELECT id FROM canonical_unit_groups WHERE key='food_service'), 'combo', 'Combo', 'combo', 1),
  ((SELECT id FROM canonical_unit_groups WHERE key='food_service'), 'slice', 'Slice', 'slice', 1),
  ((SELECT id FROM canonical_unit_groups WHERE key='length'), 'm', 'Meter', 'm', 1),
  ((SELECT id FROM canonical_unit_groups WHERE key='length'), 'cm', 'Centimeter', 'cm', 0.01)
ON CONFLICT (key) DO NOTHING;
