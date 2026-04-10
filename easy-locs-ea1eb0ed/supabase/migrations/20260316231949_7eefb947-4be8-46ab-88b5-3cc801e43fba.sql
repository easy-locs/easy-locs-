
-- =============================================
-- 1. GEO-FILTERING: search_nearby_shops RPC
-- =============================================
CREATE OR REPLACE FUNCTION public.search_nearby_shops(
  _lat double precision,
  _lng double precision,
  _radius_km double precision DEFAULT 50,
  _query text DEFAULT '',
  _vertical text DEFAULT 'all',
  _limit integer DEFAULT 50
)
RETURNS TABLE(
  id uuid, name text, slug text, description text, tagline text,
  logo_url text, banner_url text, city text, country text,
  vertical text, latitude double precision, longitude double precision,
  is_verified boolean, distance_km double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    sp.id, sp.name, sp.slug, sp.description, sp.tagline,
    sp.logo_url, sp.banner_url, sp.city, sp.country,
    sp.vertical, sp.latitude, sp.longitude,
    sp.is_verified,
    (6371 * acos(
      LEAST(1, GREATEST(-1,
        cos(radians(_lat)) * cos(radians(sp.latitude)) *
        cos(radians(sp.longitude) - radians(_lng)) +
        sin(radians(_lat)) * sin(radians(sp.latitude))
      ))
    )) AS distance_km
  FROM public.storefront_pages sp
  WHERE sp.shop_visibility = 'public'
    AND sp.latitude IS NOT NULL
    AND sp.longitude IS NOT NULL
    AND (_vertical = 'all' OR sp.vertical = _vertical)
    AND (_query = '' OR sp.name ILIKE '%' || _query || '%' OR sp.description ILIKE '%' || _query || '%' OR sp.city ILIKE '%' || _query || '%')
    AND (6371 * acos(
      LEAST(1, GREATEST(-1,
        cos(radians(_lat)) * cos(radians(sp.latitude)) *
        cos(radians(sp.longitude) - radians(_lng)) +
        sin(radians(_lat)) * sin(radians(sp.latitude))
      ))
    )) <= _radius_km
  ORDER BY distance_km ASC
  LIMIT _limit;
$$;

-- =============================================
-- 2. ANALYTICS DAILY AGGREGATION FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.aggregate_storefront_analytics_daily()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _yesterday date;
  _count integer;
BEGIN
  _yesterday := (now() - interval '1 day')::date;

  INSERT INTO public.storefront_analytics_daily (shop_id, date, views, unique_visitors, add_to_carts, checkouts, purchases, revenue, conversion_rate)
  SELECT
    shop_id,
    _yesterday AS date,
    COUNT(*) FILTER (WHERE event_type = 'page_view') AS views,
    COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'page_view') AS unique_visitors,
    COUNT(*) FILTER (WHERE event_type = 'add_to_cart') AS add_to_carts,
    COUNT(*) FILTER (WHERE event_type = 'checkout_start') AS checkouts,
    COUNT(*) FILTER (WHERE event_type = 'purchase') AS purchases,
    COALESCE(SUM(revenue) FILTER (WHERE event_type = 'purchase'), 0) AS revenue,
    CASE
      WHEN COUNT(*) FILTER (WHERE event_type = 'page_view') > 0
      THEN ROUND((COUNT(*) FILTER (WHERE event_type = 'purchase')::numeric / COUNT(*) FILTER (WHERE event_type = 'page_view') * 100), 2)
      ELSE 0
    END AS conversion_rate
  FROM public.storefront_analytics_events
  WHERE created_at >= _yesterday::timestamptz
    AND created_at < (_yesterday + 1)::timestamptz
  GROUP BY shop_id
  ON CONFLICT (shop_id, date) DO UPDATE SET
    views = EXCLUDED.views,
    unique_visitors = EXCLUDED.unique_visitors,
    add_to_carts = EXCLUDED.add_to_carts,
    checkouts = EXCLUDED.checkouts,
    purchases = EXCLUDED.purchases,
    revenue = EXCLUDED.revenue,
    conversion_rate = EXCLUDED.conversion_rate;

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

-- =============================================
-- 3. AUTO-DISPATCH TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION public.auto_dispatch_delivery_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _best_driver RECORD;
BEGIN
  -- Only fire on new pending jobs without a driver
  IF NEW.status = 'pending' AND NEW.driver_id IS NULL THEN
    -- Find best available driver in the org using composite scoring
    -- Score = distance(30%) + rating(10%) + availability(10%)
    -- We use org_members with 'agent' or 'staff' role as drivers
    SELECT
      om.user_id AS driver_id,
      COALESCE(
        -- Rating component (10% weight, scale to 0-10)
        (SELECT COALESCE(AVG(dr.rating), 3.0) FROM public.delivery_ratings dr WHERE dr.driver_id = om.user_id) * 2, 6
      ) +
      -- Availability: fewer active jobs = higher score (30% weight)
      (10 - LEAST(10, (
        SELECT COUNT(*) FROM public.delivery_jobs dj
        WHERE dj.driver_id = om.user_id AND dj.status IN ('assigned', 'accepted', 'in_progress')
      ) * 3)) * 3 +
      -- Reliability: fewer cancellations = higher score (20% weight)
      (10 - LEAST(10, (
        SELECT COUNT(*) FROM public.delivery_jobs dj
        WHERE dj.driver_id = om.user_id AND dj.status = 'cancelled' AND dj.cancelled_by = om.user_id::text
        AND dj.created_at > now() - interval '30 days'
      ))) * 2
      AS score
    INTO _best_driver
    FROM public.org_members om
    WHERE om.org_id = NEW.org_id
      AND om.role IN ('agent', 'staff')
      -- Exclude drivers with 3+ active jobs
      AND (SELECT COUNT(*) FROM public.delivery_jobs dj
           WHERE dj.driver_id = om.user_id AND dj.status IN ('assigned', 'accepted', 'in_progress')) < 3
    ORDER BY score DESC
    LIMIT 1;

    IF _best_driver.driver_id IS NOT NULL THEN
      NEW.driver_id := _best_driver.driver_id;
      NEW.status := 'assigned';
      NEW.assigned_at := now();

      -- Create notification for the driver
      INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
      VALUES (
        _best_driver.driver_id, NEW.org_id, 'info',
        '📩 Nouvelle mission auto-assignée',
        'Livraison: ' || COALESCE(NEW.pickup_address, '') || ' → ' || COALESCE(NEW.dropoff_address, ''),
        '/driver',
        jsonb_build_object('target_type', 'delivery_job', 'target_id', NEW.id::text, 'target_url', '/driver')
      );

      -- Create delivery offer record
      INSERT INTO public.delivery_offers (job_id, driver_id, org_id, status, score)
      VALUES (NEW.id, _best_driver.driver_id, NEW.org_id, 'auto_assigned', _best_driver.score);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger (drop if exists to avoid duplicates)
DROP TRIGGER IF EXISTS trg_auto_dispatch_delivery ON public.delivery_jobs;
CREATE TRIGGER trg_auto_dispatch_delivery
  BEFORE INSERT ON public.delivery_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_dispatch_delivery_job();
