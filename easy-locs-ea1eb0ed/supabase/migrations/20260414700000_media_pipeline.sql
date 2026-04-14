-- Media Pipeline Infrastructure: media_assets tracking table + orphan cleanup support

CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket text NOT NULL,
  path text NOT NULL,
  content_type text NOT NULL,
  original_width integer,
  original_height integer,
  size_bytes bigint,
  lqip_hash text,
  variants jsonb DEFAULT '[]'::jsonb,
  entity_type text,
  entity_id uuid,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT media_assets_bucket_path_unique UNIQUE (bucket, path)
);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON public.media_assets
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "owner_read" ON public.media_assets
  FOR SELECT TO authenticated
  USING (uploaded_by = auth.uid());

CREATE POLICY "owner_insert" ON public.media_assets
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "owner_update" ON public.media_assets
  FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_media_assets_entity
  ON public.media_assets (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_media_assets_bucket_path
  ON public.media_assets (bucket, path);

CREATE INDEX IF NOT EXISTS idx_media_assets_uploaded_by
  ON public.media_assets (uploaded_by);

CREATE INDEX IF NOT EXISTS idx_media_assets_created
  ON public.media_assets (created_at);

CREATE OR REPLACE FUNCTION public.upsert_media_asset(
  p_bucket text,
  p_path text,
  p_content_type text,
  p_original_width integer DEFAULT NULL,
  p_original_height integer DEFAULT NULL,
  p_size_bytes bigint DEFAULT NULL,
  p_lqip_hash text DEFAULT NULL,
  p_variants jsonb DEFAULT '[]'::jsonb,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_uploaded_by uuid DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.media_assets (
    bucket, path, content_type, original_width, original_height,
    size_bytes, lqip_hash, variants, entity_type, entity_id, uploaded_by
  ) VALUES (
    p_bucket, p_path, p_content_type, p_original_width, p_original_height,
    p_size_bytes, p_lqip_hash, p_variants, p_entity_type, p_entity_id, p_uploaded_by
  )
  ON CONFLICT (bucket, path) DO UPDATE SET
    content_type = EXCLUDED.content_type,
    original_width = COALESCE(EXCLUDED.original_width, media_assets.original_width),
    original_height = COALESCE(EXCLUDED.original_height, media_assets.original_height),
    size_bytes = COALESCE(EXCLUDED.size_bytes, media_assets.size_bytes),
    lqip_hash = COALESCE(EXCLUDED.lqip_hash, media_assets.lqip_hash),
    variants = EXCLUDED.variants,
    entity_type = COALESCE(EXCLUDED.entity_type, media_assets.entity_type),
    entity_id = COALESCE(EXCLUDED.entity_id, media_assets.entity_id),
    updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_media_asset(text, text, text, integer, integer, bigint, text, jsonb, text, uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_media_asset(text, text, text, integer, integer, bigint, text, jsonb, text, uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.find_orphan_media(p_limit integer DEFAULT 100)
RETURNS TABLE(id uuid, bucket text, path text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT ma.id, ma.bucket, ma.path, ma.created_at
  FROM public.media_assets ma
  WHERE ma.entity_id IS NOT NULL
    AND ma.created_at < now() - interval '24 hours'
    AND ma.entity_type IN ('storefront', 'listing', 'property', 'profile', 'product')
    AND (
      (ma.entity_type = 'storefront' AND NOT EXISTS (
        SELECT 1 FROM public.storefront_pages sp WHERE sp.id = ma.entity_id
      ))
      OR
      (ma.entity_type = 'listing' AND NOT EXISTS (
        SELECT 1 FROM marketplace.listings l WHERE l.id = ma.entity_id
      ))
      OR
      (ma.entity_type = 'property' AND NOT EXISTS (
        SELECT 1 FROM property.properties p WHERE p.id = ma.entity_id
      ))
      OR
      (ma.entity_type = 'profile' AND NOT EXISTS (
        SELECT 1 FROM identity.profiles pr WHERE pr.id = ma.entity_id
      ))
      OR
      (ma.entity_type = 'product' AND NOT EXISTS (
        SELECT 1 FROM public.seed_products sp WHERE sp.id = ma.entity_id
      ))
    )
  ORDER BY ma.created_at ASC
  LIMIT p_limit;
$$;

REVOKE EXECUTE ON FUNCTION public.find_orphan_media(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_orphan_media(integer) TO service_role;

-- Schedule orphan media cleanup every 6 hours via pg_cron + pg_net
-- Invokes the cleanup-orphan-media edge function with service_role auth
DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-orphan-media',
      '0 */6 * * *',
      $cron$
      SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/cleanup-orphan-media',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
      $cron$
    );
  END IF;
END;
$outer$;
