-- Persist BNPL plans and e-signature envelopes (Task #537)

CREATE TABLE IF NOT EXISTS public.bnpl_plans (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  installment_count INTEGER NOT NULL,
  installments JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  merchant_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bnpl_plans_user_id ON public.bnpl_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_bnpl_plans_status ON public.bnpl_plans(status);

CREATE TABLE IF NOT EXISTS public.signature_envelopes (
  id TEXT PRIMARY KEY,
  lease_id TEXT NOT NULL,
  title TEXT NOT NULL,
  document_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  parties JSONB NOT NULL DEFAULT '[]'::jsonb,
  signed_document_url TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signature_envelopes_lease_id ON public.signature_envelopes(lease_id);
CREATE INDEX IF NOT EXISTS idx_signature_envelopes_user_id ON public.signature_envelopes(user_id);
CREATE INDEX IF NOT EXISTS idx_signature_envelopes_status ON public.signature_envelopes(status);

-- RLS
ALTER TABLE public.bnpl_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_envelopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own BNPL plans" ON public.bnpl_plans
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own BNPL plans" ON public.bnpl_plans
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own BNPL plans" ON public.bnpl_plans
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Authenticated can view signature envelopes" ON public.signature_envelopes
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(parties) p
      WHERE lower(p->>'email') = lower(auth.jwt()->>'email')
    )
  );

CREATE POLICY "Users can insert own signature envelopes" ON public.signature_envelopes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner can update own signature envelopes" ON public.signature_envelopes
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Secure RPC for participant signing (validates caller email matches party)
CREATE OR REPLACE FUNCTION public.sign_envelope_party(
  p_envelope_id TEXT,
  p_party_id TEXT,
  p_signature_url TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_envelope RECORD;
  v_caller_email TEXT;
  v_parties JSONB;
  v_party JSONB;
  v_party_email TEXT;
  v_idx INT;
  v_all_signed BOOLEAN;
  v_new_status TEXT;
BEGIN
  v_caller_email := lower(auth.jwt()->>'email');
  IF v_caller_email IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_envelope FROM public.signature_envelopes WHERE id = p_envelope_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Envelope not found');
  END IF;

  v_parties := v_envelope.parties;
  v_idx := -1;

  FOR i IN 0..jsonb_array_length(v_parties) - 1 LOOP
    v_party := v_parties->i;
    IF v_party->>'id' = p_party_id THEN
      v_idx := i;
      v_party_email := lower(v_party->>'email');
      EXIT;
    END IF;
  END LOOP;

  IF v_idx < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Party not found');
  END IF;

  IF v_party_email <> v_caller_email THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized for this party');
  END IF;

  IF v_party->>'status' = 'signed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Already signed');
  END IF;

  v_parties := jsonb_set(v_parties, ARRAY[v_idx::text, 'status'], '"signed"'::jsonb);
  v_parties := jsonb_set(v_parties, ARRAY[v_idx::text, 'signedAt'], to_jsonb(now()::text));
  v_parties := jsonb_set(v_parties, ARRAY[v_idx::text, 'signatureUrl'], to_jsonb(p_signature_url));

  v_all_signed := true;
  FOR i IN 0..jsonb_array_length(v_parties) - 1 LOOP
    IF v_parties->i->>'status' <> 'signed' THEN
      v_all_signed := false;
      EXIT;
    END IF;
  END LOOP;

  v_new_status := CASE WHEN v_all_signed THEN 'signed' ELSE v_envelope.status END;

  UPDATE public.signature_envelopes
  SET parties = v_parties,
      status = v_new_status,
      signed_document_url = CASE WHEN v_all_signed THEN v_envelope.document_url ELSE v_envelope.signed_document_url END,
      updated_at = now()
  WHERE id = p_envelope_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Secure RPC for participant declining (validates caller email matches party)
CREATE OR REPLACE FUNCTION public.decline_envelope_party(
  p_envelope_id TEXT,
  p_party_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_envelope RECORD;
  v_caller_email TEXT;
  v_parties JSONB;
  v_party JSONB;
  v_party_email TEXT;
  v_idx INT;
BEGIN
  v_caller_email := lower(auth.jwt()->>'email');
  IF v_caller_email IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_envelope FROM public.signature_envelopes WHERE id = p_envelope_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Envelope not found');
  END IF;

  v_parties := v_envelope.parties;
  v_idx := -1;

  FOR i IN 0..jsonb_array_length(v_parties) - 1 LOOP
    v_party := v_parties->i;
    IF v_party->>'id' = p_party_id THEN
      v_idx := i;
      v_party_email := lower(v_party->>'email');
      EXIT;
    END IF;
  END LOOP;

  IF v_idx < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Party not found');
  END IF;

  IF v_party_email <> v_caller_email THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized for this party');
  END IF;

  v_parties := jsonb_set(v_parties, ARRAY[v_idx::text, 'status'], '"declined"'::jsonb);

  UPDATE public.signature_envelopes
  SET parties = v_parties,
      status = 'declined',
      updated_at = now()
  WHERE id = p_envelope_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sign_envelope_party(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_envelope_party(TEXT, TEXT) TO authenticated;
