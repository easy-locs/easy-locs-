INSERT INTO storage.buckets (id, name, public)
VALUES
  ('onboarding-media', 'onboarding-media', true),
  ('kyc-documents', 'kyc-documents', false),
  ('products', 'products', true),
  ('storefront-media', 'storefront-media', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'onboarding_media_public_read' AND tablename = 'objects'
  ) THEN
    CREATE POLICY onboarding_media_public_read ON storage.objects FOR SELECT
      USING (bucket_id = 'onboarding-media');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'onboarding_media_auth_upload' AND tablename = 'objects'
  ) THEN
    CREATE POLICY onboarding_media_auth_upload ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'onboarding-media' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'kyc_documents_owner_select' AND tablename = 'objects'
  ) THEN
    CREATE POLICY kyc_documents_owner_select ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'kyc_documents_owner_insert' AND tablename = 'objects'
  ) THEN
    CREATE POLICY kyc_documents_owner_insert ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'kyc_documents_owner_delete' AND tablename = 'objects'
  ) THEN
    CREATE POLICY kyc_documents_owner_delete ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'products_public_read' AND tablename = 'objects'
  ) THEN
    CREATE POLICY products_public_read ON storage.objects FOR SELECT
      USING (bucket_id = 'products');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'products_auth_upload' AND tablename = 'objects'
  ) THEN
    CREATE POLICY products_auth_upload ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'products' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'storefront_media_public_read' AND tablename = 'objects'
  ) THEN
    CREATE POLICY storefront_media_public_read ON storage.objects FOR SELECT
      USING (bucket_id = 'storefront-media');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'storefront_media_auth_upload' AND tablename = 'objects'
  ) THEN
    CREATE POLICY storefront_media_auth_upload ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'storefront-media' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;
