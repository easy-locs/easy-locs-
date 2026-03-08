
-- Marketplace Providers table
CREATE TABLE public.marketplace_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL DEFAULT 'individual',
  company_name TEXT,
  display_name TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL,
  bio TEXT DEFAULT '',
  avatar_url TEXT,
  cover_photo_url TEXT,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  website_url TEXT,
  country TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  address TEXT DEFAULT '',
  categories TEXT[] NOT NULL DEFAULT '{}',
  payment_stripe_link TEXT,
  payment_paypal_email TEXT,
  payment_bank_details JSONB DEFAULT '{}',
  payment_custom_url TEXT,
  rating NUMERIC DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(slug)
);

-- Marketplace Services table
CREATE TABLE public.marketplace_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.marketplace_providers(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other',
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  price_type TEXT NOT NULL DEFAULT 'fixed',
  duration_minutes INTEGER,
  country TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  location TEXT DEFAULT '',
  photo_urls JSONB DEFAULT '[]',
  time_slots JSONB DEFAULT '[]',
  blocked_dates JSONB DEFAULT '[]',
  max_capacity INTEGER DEFAULT 1,
  payment_stripe_link TEXT,
  payment_paypal_email TEXT,
  payment_bank_details JSONB DEFAULT '{}',
  payment_custom_url TEXT,
  badges TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Marketplace Bookings table
CREATE TABLE public.marketplace_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.marketplace_services(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.marketplace_providers(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  booker_user_id UUID,
  booker_name TEXT NOT NULL DEFAULT '',
  booker_email TEXT NOT NULL DEFAULT '',
  booker_phone TEXT DEFAULT '',
  property_id UUID REFERENCES public.properties(id),
  service_date DATE,
  service_time TEXT,
  quantity INTEGER DEFAULT 1,
  total_price NUMERIC DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT DEFAULT 'pending',
  payment_link_sent BOOLEAN DEFAULT false,
  payment_confirmed BOOLEAN DEFAULT false,
  payment_confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_bookings ENABLE ROW LEVEL SECURITY;

-- RLS: Providers
CREATE POLICY "Public can read active providers" ON public.marketplace_providers
  FOR SELECT USING (active = true);

CREATE POLICY "Org members can manage own providers" ON public.marketplace_providers
  FOR ALL USING (is_org_member(auth.uid(), org_id))
  WITH CHECK (is_org_member(auth.uid(), org_id));

-- RLS: Services
CREATE POLICY "Public can read active services" ON public.marketplace_services
  FOR SELECT USING (active = true);

CREATE POLICY "Org members can manage own services" ON public.marketplace_services
  FOR ALL USING (is_org_member(auth.uid(), org_id))
  WITH CHECK (is_org_member(auth.uid(), org_id));

-- RLS: Bookings
CREATE POLICY "Anyone can create bookings" ON public.marketplace_bookings
  FOR INSERT WITH CHECK (
    booker_name IS NOT NULL AND booker_name <> '' AND
    booker_email IS NOT NULL AND booker_email <> '' AND
    service_id IS NOT NULL AND status = 'pending'
  );

CREATE POLICY "Org members can manage bookings" ON public.marketplace_bookings
  FOR ALL USING (is_org_member(auth.uid(), org_id))
  WITH CHECK (is_org_member(auth.uid(), org_id));

CREATE POLICY "Bookers can read own bookings" ON public.marketplace_bookings
  FOR SELECT USING (booker_user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_marketplace_providers_updated_at BEFORE UPDATE ON public.marketplace_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_marketplace_services_updated_at BEFORE UPDATE ON public.marketplace_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_marketplace_bookings_updated_at BEFORE UPDATE ON public.marketplace_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Notification trigger for new bookings
CREATE OR REPLACE FUNCTION public.notify_marketplace_booking()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _provider_user_id uuid;
  _service_title text;
BEGIN
  SELECT mp.user_id INTO _provider_user_id FROM public.marketplace_providers mp WHERE mp.id = NEW.provider_id LIMIT 1;
  SELECT ms.title INTO _service_title FROM public.marketplace_services ms WHERE ms.id = NEW.service_id LIMIT 1;

  IF _provider_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, org_id, type, title, message, link)
    VALUES (_provider_user_id, NEW.org_id, 'info',
      '🎯 New marketplace booking',
      COALESCE(NEW.booker_name, 'Client') || ' booked ' || COALESCE(_service_title, 'service') || ' — ' || NEW.total_price || ' ' || NEW.currency,
      '/dashboard/activities');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_marketplace_booking_created
  AFTER INSERT ON public.marketplace_bookings
  FOR EACH ROW EXECUTE FUNCTION notify_marketplace_booking();

-- Enable realtime for bookings
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_bookings;
