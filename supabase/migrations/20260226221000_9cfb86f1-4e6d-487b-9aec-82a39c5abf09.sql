-- Create vault storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('vault', 'vault', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for vault bucket
CREATE POLICY "Org members can upload vault files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'vault'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Org members can read own vault files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'vault'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Org members can delete own vault files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'vault'
  AND auth.uid() IS NOT NULL
);