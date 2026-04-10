
-- Atomic boost purchase RPC: deducts LOCS, creates boost entry, updates storefront
CREATE OR REPLACE FUNCTION public.purchase_boost(
  _user_id UUID,
  _target_type TEXT,
  _target_id TEXT,
  _shop_id UUID DEFAULT NULL,
  _tier TEXT DEFAULT 'basic',
  _locs_cost NUMERIC DEFAULT 5,
  _duration_days INT DEFAULT 3,
  _impressions_budget INT DEFAULT 500,
  _label TEXT DEFAULT 'Basic Boost'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _balance NUMERIC;
  _boost_id UUID;
  _ends_at TIMESTAMPTZ;
BEGIN
  -- Validate caller
  IF auth.uid() IS NULL OR auth.uid() != _user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF _locs_cost <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid cost');
  END IF;

  -- Lock sender wallet row
  SELECT balance INTO _balance
  FROM public.wallet_balances
  WHERE user_id = _user_id AND currency = 'LOCS'
  FOR UPDATE;

  IF _balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No wallet found');
  END IF;

  IF _balance < _locs_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient LOCS');
  END IF;

  -- Debit wallet atomically
  UPDATE public.wallet_balances
  SET balance = balance - _locs_cost,
      total_spent = COALESCE(total_spent, 0) + _locs_cost,
      updated_at = now()
  WHERE user_id = _user_id AND currency = 'LOCS';

  -- Record transaction
  INSERT INTO public.wallet_transactions (
    user_id, type, direction, amount, currency,
    description, status, reference_type, reference_id
  ) VALUES (
    _user_id, 'boost', 'out', _locs_cost, 'LOCS',
    _label || ' — ' || _target_type, 'completed', 'boost', _target_id
  );

  -- Create boost purchase entry
  _ends_at := now() + (_duration_days || ' days')::interval;

  INSERT INTO public.boost_purchases (
    user_id, target_type, target_id, shop_id, tier,
    locs_spent, starts_at, ends_at, impressions_budget, status
  ) VALUES (
    _user_id, _target_type, _target_id, _shop_id, _tier,
    _locs_cost, now(), _ends_at, _impressions_budget, 'active'
  ) RETURNING id INTO _boost_id;

  -- Update storefront_pages boost metadata so ranking engine picks it up
  IF _shop_id IS NOT NULL THEN
    UPDATE public.storefront_pages
    SET boost_tier = _tier,
        boost_until = _ends_at,
        updated_at = now()
    WHERE id = _shop_id;
  END IF;

  -- If target is a service, update its boost fields too
  IF _target_type = 'service' THEN
    UPDATE public.concierge_services
    SET boost_tier = _tier,
        boost_until = _ends_at,
        updated_at = now()
    WHERE id = _target_id::uuid;
  END IF;

  -- Audit
  INSERT INTO public.audit_logs (user_id, action, metadata_json)
  VALUES (_user_id, 'boost_purchase', jsonb_build_object(
    'boost_id', _boost_id,
    'tier', _tier,
    'locs_spent', _locs_cost,
    'target_type', _target_type,
    'target_id', _target_id,
    'shop_id', _shop_id,
    'ends_at', _ends_at
  ));

  RETURN jsonb_build_object(
    'success', true,
    'boost_id', _boost_id,
    'ends_at', _ends_at
  );
END;
$$;

-- Ensure catalog-photos storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('catalog-photos', 'catalog-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload
CREATE POLICY "Users can upload catalog photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'catalog-photos');

CREATE POLICY "Public read catalog photos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'catalog-photos');

CREATE POLICY "Users can delete own catalog photos" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'catalog-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
