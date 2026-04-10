CREATE OR REPLACE FUNCTION public.create_api_key(_org_id uuid, _name text, _scopes text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _key text; _prefix text; _id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.orgs WHERE id = _org_id AND owner_user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  _key    := 'el_' || encode(gen_random_bytes(32), 'hex');
  _prefix := substring(_key from 1 for 10) || '...';
  _id     := gen_random_uuid();
  INSERT INTO public.api_keys (id, org_id, user_id, name, key_hash, key_prefix, scopes)
  VALUES (_id, _org_id, auth.uid(), _name,
    encode(sha256(_key::bytea), 'hex'),
    _prefix, _scopes);
  RETURN jsonb_build_object('success', true, 'key', _key, 'id', _id, 'prefix', _prefix);
END; $$;