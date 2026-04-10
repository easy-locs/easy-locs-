
-- ═══════ ORBIT V1: Missing Schema (Modules 1, 4, 5) ═══════

-- Module 1: Identity Hierarchy — Company → Brand → Branch
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  logo_url text,
  country text,
  city text,
  website text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage companies" ON public.companies FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), org_id))
  WITH CHECK (public.is_org_member(auth.uid(), org_id));

CREATE TABLE IF NOT EXISTS public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  logo_url text,
  shop_id uuid REFERENCES public.storefront_pages(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage brands" ON public.brands FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), org_id))
  WITH CHECK (public.is_org_member(auth.uid(), org_id));

CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  address text,
  city text,
  country text,
  latitude double precision,
  longitude double precision,
  phone text,
  email text,
  shop_id uuid REFERENCES public.storefront_pages(id) ON DELETE SET NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage branches" ON public.branches FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), org_id))
  WITH CHECK (public.is_org_member(auth.uid(), org_id));

-- Module 5: Global Category Engine
CREATE TABLE IF NOT EXISTS public.verticals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  icon text,
  description text,
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.verticals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read verticals" ON public.verticals FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id uuid NOT NULL REFERENCES public.verticals(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  icon text,
  description text,
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(vertical_id, slug)
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  icon text,
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(category_id, slug)
);
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read subcategories" ON public.subcategories FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.category_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  subcategory_id uuid REFERENCES public.subcategories(id) ON DELETE CASCADE,
  attribute_key text NOT NULL,
  attribute_label text NOT NULL,
  attribute_type text DEFAULT 'text',
  options jsonb,
  required boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.category_attributes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read category_attributes" ON public.category_attributes FOR SELECT TO anon, authenticated USING (true);

-- Seed verticals
INSERT INTO public.verticals (slug, name, icon, sort_order) VALUES
  ('food', 'Food & Restaurants', '🍕', 1),
  ('grocery', 'Grocery', '🛒', 2),
  ('shops', 'Shops & Retail', '🏪', 3),
  ('services', 'Services', '🔧', 4),
  ('travel', 'Travel & Tourism', '✈️', 5),
  ('jobs', 'Jobs & Careers', '💼', 6),
  ('property', 'Real Estate', '🏠', 7),
  ('property_management', 'Property Management', '🏢', 8)
ON CONFLICT (slug) DO NOTHING;

-- Seed some categories
INSERT INTO public.categories (vertical_id, slug, name, icon, sort_order)
SELECT v.id, c.slug, c.name, c.icon, c.sort_order
FROM public.verticals v
CROSS JOIN (VALUES
  ('food', 'restaurant', 'Restaurant', '🍽️', 1),
  ('food', 'fast-food', 'Fast Food', '🍔', 2),
  ('food', 'bakery', 'Bakery', '🥐', 3),
  ('food', 'cafe', 'Café', '☕', 4),
  ('food', 'catering', 'Catering', '🍱', 5),
  ('grocery', 'supermarket', 'Supermarket', '🏬', 1),
  ('grocery', 'organic', 'Organic', '🥗', 2),
  ('shops', 'clothing', 'Clothing', '👕', 1),
  ('shops', 'electronics', 'Electronics', '📱', 2),
  ('shops', 'beauty', 'Beauty', '💄', 3),
  ('shops', 'home', 'Home & Garden', '🏡', 4),
  ('services', 'cleaning', 'Cleaning', '🧹', 1),
  ('services', 'repair', 'Repair', '🔧', 2),
  ('services', 'delivery', 'Delivery', '📦', 3),
  ('services', 'consulting', 'Consulting', '💡', 4),
  ('travel', 'hotel', 'Hotel', '🏨', 1),
  ('travel', 'tours', 'Tours', '🗺️', 2),
  ('travel', 'transport', 'Transport', '🚗', 3)
) AS c(v_slug, slug, name, icon, sort_order)
WHERE v.slug = c.v_slug
ON CONFLICT (vertical_id, slug) DO NOTHING;
