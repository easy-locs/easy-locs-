
-- Add category column to storefront_pages
ALTER TABLE public.storefront_pages ADD COLUMN IF NOT EXISTS category text;

-- Create canonical products table
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  category text,
  subcategory text,
  name text NOT NULL,
  description text,
  image_url text,
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'AED',
  is_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read available products" ON public.products
  FOR SELECT TO anon, authenticated USING (is_available = true);

CREATE POLICY "Shop owners can manage products" ON public.products
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = products.shop_id AND sp.user_id = auth.uid())
  );

-- Create business_videos table
CREATE TABLE IF NOT EXISTS public.business_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  video_type text NOT NULL DEFAULT 'shop',
  public_url text NOT NULL,
  thumbnail_url text,
  duration_sec integer,
  city text,
  area text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'processing',
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view ready videos" ON public.business_videos
  FOR SELECT TO anon, authenticated USING (status = 'ready');

CREATE POLICY "Shop owners can manage videos" ON public.business_videos
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = business_videos.shop_id AND sp.user_id = auth.uid())
  );

-- Enable realtime on products for live menu updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
