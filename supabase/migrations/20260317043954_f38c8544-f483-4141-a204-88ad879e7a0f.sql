
-- =============================================
-- PASS117: Trust Engine — seller trust scores
-- =============================================
CREATE TABLE public.storefront_trust_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  trust_score INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  avg_rating NUMERIC(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  response_rate NUMERIC(5,2) DEFAULT 0,
  avg_response_minutes INTEGER DEFAULT 0,
  verified_identity BOOLEAN DEFAULT false,
  verified_email BOOLEAN DEFAULT true,
  account_age_days INTEGER DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  last_computed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id)
);

ALTER TABLE public.storefront_trust_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view trust scores" ON public.storefront_trust_scores
  FOR SELECT USING (true);

CREATE POLICY "Owner can update trust score" ON public.storefront_trust_scores
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- Auto-compute trust score function
CREATE OR REPLACE FUNCTION public.compute_trust_score(p_shop_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_score INTEGER := 0;
  v_avg_rating NUMERIC;
  v_total_reviews INTEGER;
  v_completed INTEGER;
  v_total INTEGER;
  v_account_days INTEGER;
  v_verified BOOLEAN;
BEGIN
  -- Get review stats
  SELECT COALESCE(AVG(rating), 0), COUNT(*)
  INTO v_avg_rating, v_total_reviews
  FROM public.storefront_reviews WHERE shop_id = p_shop_id;

  -- Get order stats
  SELECT COUNT(*) FILTER (WHERE status = 'completed'), COUNT(*)
  INTO v_completed, v_total
  FROM public.storefront_orders WHERE shop_id = p_shop_id;

  -- Account age
  SELECT EXTRACT(DAY FROM now() - MIN(created_at))::INTEGER
  INTO v_account_days
  FROM public.storefront_pages WHERE id = p_shop_id;

  -- Check verified
  SELECT verified_identity INTO v_verified
  FROM public.storefront_trust_scores WHERE shop_id = p_shop_id;

  -- Scoring algorithm (0-100)
  -- Rating: 0-30 points
  v_score := v_score + LEAST(30, (v_avg_rating / 5.0 * 30)::INTEGER);
  -- Reviews count: 0-15 points
  v_score := v_score + LEAST(15, v_total_reviews);
  -- Completion rate: 0-25 points
  IF v_total > 0 THEN
    v_score := v_score + ((v_completed::NUMERIC / v_total) * 25)::INTEGER;
  END IF;
  -- Account age: 0-15 points
  v_score := v_score + LEAST(15, COALESCE(v_account_days, 0) / 30);
  -- Verified identity: 15 points
  IF COALESCE(v_verified, false) THEN
    v_score := v_score + 15;
  END IF;

  -- Update the record
  INSERT INTO public.storefront_trust_scores (shop_id, user_id, trust_score, avg_rating, total_reviews, completed_orders, total_orders, account_age_days, last_computed_at)
  SELECT p_shop_id, sp.user_id, v_score, v_avg_rating, v_total_reviews, v_completed, v_total, COALESCE(v_account_days, 0), now()
  FROM public.storefront_pages sp WHERE sp.id = p_shop_id
  ON CONFLICT (shop_id) DO UPDATE SET
    trust_score = v_score,
    avg_rating = v_avg_rating,
    total_reviews = v_total_reviews,
    completed_orders = v_completed,
    total_orders = v_total,
    account_age_days = COALESCE(v_account_days, 0),
    last_computed_at = now(),
    updated_at = now();

  RETURN v_score;
END;
$$;

-- Trigger: recompute trust on new review
CREATE OR REPLACE FUNCTION public.trg_recompute_trust_on_review()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.compute_trust_score(NEW.shop_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_trust_on_review
AFTER INSERT OR UPDATE ON public.storefront_reviews
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_trust_on_review();

-- Trigger: recompute trust on order status change
CREATE OR REPLACE FUNCTION public.trg_recompute_trust_on_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.compute_trust_score(NEW.shop_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_trust_on_order
AFTER UPDATE ON public.storefront_orders
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_trust_on_order();


-- =============================================
-- PASS118: Loyalty Engine — auto-award trigger
-- =============================================

-- Trigger: auto-award loyalty points on order completion
CREATE OR REPLACE FUNCTION public.trg_award_loyalty_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_program RECORD;
  v_points INTEGER;
  v_member_id UUID;
  v_new_total INTEGER;
  v_tier_id UUID;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    -- Find loyalty program for this shop
    SELECT * INTO v_program FROM public.storefront_loyalty_programs
    WHERE shop_id = NEW.shop_id AND active = true LIMIT 1;

    IF v_program IS NULL OR NEW.buyer_id IS NULL THEN RETURN NEW; END IF;

    -- Calculate points
    v_points := GREATEST(1, (NEW.total_amount * v_program.points_per_currency)::INTEGER);

    -- Ensure member exists
    INSERT INTO public.storefront_loyalty_members (shop_id, user_id)
    VALUES (NEW.shop_id, NEW.buyer_id)
    ON CONFLICT (shop_id, user_id) DO NOTHING;

    SELECT id INTO v_member_id FROM public.storefront_loyalty_members
    WHERE shop_id = NEW.shop_id AND user_id = NEW.buyer_id;

    -- Add points
    INSERT INTO public.storefront_loyalty_points (program_id, user_id, points)
    VALUES (v_program.id, NEW.buyer_id, v_points)
    ON CONFLICT (program_id, user_id) DO UPDATE SET
      points = storefront_loyalty_points.points + v_points,
      updated_at = now();

    -- Get new total
    SELECT points INTO v_new_total FROM public.storefront_loyalty_points
    WHERE program_id = v_program.id AND user_id = NEW.buyer_id;

    -- Auto-assign tier
    SELECT id INTO v_tier_id FROM public.storefront_loyalty_tiers
    WHERE program_id = v_program.id AND min_points <= v_new_total
    ORDER BY min_points DESC LIMIT 1;

    IF v_tier_id IS NOT NULL THEN
      UPDATE public.storefront_loyalty_points SET tier_id = v_tier_id
      WHERE program_id = v_program.id AND user_id = NEW.buyer_id;
    END IF;

    -- Log transaction
    INSERT INTO public.storefront_loyalty_transactions (shop_id, member_id, points, type, description)
    VALUES (NEW.shop_id, v_member_id, v_points, 'earn', 'Order #' || LEFT(NEW.id::TEXT, 8) || ' completed');

    -- Log history
    INSERT INTO public.storefront_loyalty_history (program_id, user_id, points_change, reason)
    VALUES (v_program.id, NEW.buyer_id, v_points, 'Order completed');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_loyalty_on_order_complete
AFTER UPDATE ON public.storefront_orders
FOR EACH ROW EXECUTE FUNCTION public.trg_award_loyalty_points();


-- =============================================
-- PASS119: Risk / Fraud Engine
-- =============================================
CREATE TABLE public.storefront_risk_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  user_id UUID,
  order_id UUID,
  flag_type TEXT NOT NULL DEFAULT 'suspicious_order',
  severity TEXT NOT NULL DEFAULT 'medium',
  reason TEXT NOT NULL,
  metadata_json JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open',
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.storefront_risk_flags ENABLE ROW LEVEL SECURITY;

-- Only shop owner can see their risk flags
CREATE POLICY "Shop owner views risk flags" ON public.storefront_risk_flags
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
  );

CREATE POLICY "System inserts risk flags" ON public.storefront_risk_flags
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Shop owner resolves risk flags" ON public.storefront_risk_flags
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
  );

-- Auto-flag suspicious orders
CREATE OR REPLACE FUNCTION public.trg_risk_check_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_recent_count INTEGER;
  v_avg_order NUMERIC;
BEGIN
  -- Flag 1: High value order (>3x avg)
  SELECT AVG(total_amount) INTO v_avg_order
  FROM public.storefront_orders WHERE shop_id = NEW.shop_id AND status != 'cancelled';

  IF v_avg_order > 0 AND NEW.total_amount > v_avg_order * 3 THEN
    INSERT INTO public.storefront_risk_flags (shop_id, user_id, order_id, flag_type, severity, reason)
    VALUES (NEW.shop_id, NEW.buyer_id, NEW.id, 'high_value', 'high',
      'Order amount (' || NEW.total_amount || ') is 3x+ above average (' || ROUND(v_avg_order, 2) || ')');
  END IF;

  -- Flag 2: Velocity check (>5 orders in 1 hour from same buyer)
  IF NEW.buyer_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_recent_count
    FROM public.storefront_orders
    WHERE buyer_id = NEW.buyer_id AND shop_id = NEW.shop_id
    AND created_at > now() - interval '1 hour';

    IF v_recent_count > 5 THEN
      INSERT INTO public.storefront_risk_flags (shop_id, user_id, order_id, flag_type, severity, reason)
      VALUES (NEW.shop_id, NEW.buyer_id, NEW.id, 'velocity', 'critical',
        v_recent_count || ' orders in the last hour from same buyer');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_risk_on_new_order
AFTER INSERT ON public.storefront_orders
FOR EACH ROW EXECUTE FUNCTION public.trg_risk_check_order();


-- =============================================
-- PASS120: Growth Engine — referral tracking trigger
-- =============================================
CREATE TABLE public.storefront_growth_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  new_customers INTEGER DEFAULT 0,
  returning_customers INTEGER DEFAULT 0,
  referral_orders INTEGER DEFAULT 0,
  organic_orders INTEGER DEFAULT 0,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  avg_order_value NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, metric_date)
);

ALTER TABLE public.storefront_growth_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owner views growth metrics" ON public.storefront_growth_metrics
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
  );

CREATE POLICY "System inserts growth metrics" ON public.storefront_growth_metrics
  FOR ALL WITH CHECK (true);

-- Auto-track growth on each order
CREATE OR REPLACE FUNCTION public.trg_track_growth_metrics()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_is_returning BOOLEAN;
  v_is_referral BOOLEAN;
BEGIN
  -- Check returning customer
  SELECT EXISTS (
    SELECT 1 FROM public.storefront_orders
    WHERE shop_id = NEW.shop_id AND buyer_id = NEW.buyer_id AND id != NEW.id
  ) INTO v_is_returning;

  -- Check if referral order (has referral_code in metadata)
  v_is_referral := (NEW.metadata_json->>'referral_code') IS NOT NULL;

  INSERT INTO public.storefront_growth_metrics (shop_id, metric_date, new_customers, returning_customers, referral_orders, organic_orders, total_revenue, avg_order_value)
  VALUES (
    NEW.shop_id, CURRENT_DATE,
    CASE WHEN NOT v_is_returning THEN 1 ELSE 0 END,
    CASE WHEN v_is_returning THEN 1 ELSE 0 END,
    CASE WHEN v_is_referral THEN 1 ELSE 0 END,
    CASE WHEN NOT v_is_referral THEN 1 ELSE 0 END,
    NEW.total_amount,
    NEW.total_amount
  )
  ON CONFLICT (shop_id, metric_date) DO UPDATE SET
    new_customers = storefront_growth_metrics.new_customers + EXCLUDED.new_customers,
    returning_customers = storefront_growth_metrics.returning_customers + EXCLUDED.returning_customers,
    referral_orders = storefront_growth_metrics.referral_orders + EXCLUDED.referral_orders,
    organic_orders = storefront_growth_metrics.organic_orders + EXCLUDED.organic_orders,
    total_revenue = storefront_growth_metrics.total_revenue + EXCLUDED.total_revenue,
    avg_order_value = (storefront_growth_metrics.total_revenue + EXCLUDED.total_revenue) /
      NULLIF(storefront_growth_metrics.new_customers + storefront_growth_metrics.returning_customers + EXCLUDED.new_customers + EXCLUDED.returning_customers, 0);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_growth_on_order
AFTER INSERT ON public.storefront_orders
FOR EACH ROW EXECUTE FUNCTION public.trg_track_growth_metrics();
