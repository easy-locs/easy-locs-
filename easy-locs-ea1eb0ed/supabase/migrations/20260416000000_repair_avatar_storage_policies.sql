DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
  DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
  DROP POLICY IF EXISTS "public read avatars" ON storage.objects;
  DROP POLICY IF EXISTS "authenticated upload avatars" ON storage.objects;
  DROP POLICY IF EXISTS "avatars_select" ON storage.objects;
  DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
  DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
  DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;
  DROP POLICY IF EXISTS "avatars_select_v2" ON storage.objects;
  DROP POLICY IF EXISTS "avatars_insert_v2" ON storage.objects;
  DROP POLICY IF EXISTS "avatars_update_v2" ON storage.objects;
  DROP POLICY IF EXISTS "avatars_delete_v2" ON storage.objects;

  INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;

  CREATE POLICY "avatars_select_v2"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

  CREATE POLICY "avatars_insert_v2"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

  CREATE POLICY "avatars_update_v2"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

  CREATE POLICY "avatars_delete_v2"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
END $$;
