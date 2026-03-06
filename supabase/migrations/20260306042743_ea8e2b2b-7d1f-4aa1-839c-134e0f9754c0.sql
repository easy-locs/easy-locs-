
-- 1. Auto-generate receipt record when rent_call is marked as paid
CREATE OR REPLACE FUNCTION public.auto_generate_receipt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger when paid changes from false/null to true
  IF NEW.paid = true AND (OLD.paid IS NULL OR OLD.paid = false) THEN
    -- Insert a receipt document record
    INSERT INTO public.documents (org_id, user_id, doc_type, title, country, data_json, status)
    SELECT
      NEW.org_id,
      o.owner_user_id,
      'rent-receipt',
      'Quittance ' || NEW.month,
      COALESCE(p.country, 'FR'),
      jsonb_build_object(
        'month', NEW.month,
        'rent_amount', NEW.rent_amount,
        'charges_amount', NEW.charges_amount,
        'total_amount', NEW.total_amount,
        'paid_date', COALESCE(NEW.paid_date, CURRENT_DATE::text),
        'tenant_id', NEW.tenant_id,
        'property_id', NEW.property_id
      ),
      'generated'
    FROM public.orgs o
    LEFT JOIN public.properties p ON p.id = NEW.property_id
    WHERE o.id = NEW.org_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_auto_generate_receipt
  AFTER UPDATE ON public.rent_calls
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_receipt();

-- 2. Add white-label branding columns to orgs
ALTER TABLE public.orgs
  ADD COLUMN IF NOT EXISTS brand_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS brand_primary_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS brand_accent_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS brand_favicon_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_domain text DEFAULT NULL;

-- 3. API keys table for developer portal
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Default',
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY['read'],
  last_used_at timestamptz,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org owners can manage API keys"
  ON public.api_keys FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orgs WHERE id = api_keys.org_id AND owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.orgs WHERE id = api_keys.org_id AND owner_user_id = auth.uid()));

-- Function to generate API key (returns full key only once)
CREATE OR REPLACE FUNCTION public.create_api_key(_org_id uuid, _name text, _scopes text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _key text;
  _prefix text;
  _id uuid;
BEGIN
  -- Verify caller is org owner
  IF NOT EXISTS (SELECT 1 FROM public.orgs WHERE id = _org_id AND owner_user_id = auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  _key := 'el_' || encode(gen_random_bytes(32), 'hex');
  _prefix := substring(_key from 1 for 10) || '...';
  _id := gen_random_uuid();

  INSERT INTO public.api_keys (id, org_id, user_id, name, key_hash, key_prefix, scopes)
  VALUES (_id, _org_id, auth.uid(), _name, md5(_key), _prefix, _scopes);

  RETURN jsonb_build_object('success', true, 'key', _key, 'id', _id, 'prefix', _prefix);
END;
$$;
