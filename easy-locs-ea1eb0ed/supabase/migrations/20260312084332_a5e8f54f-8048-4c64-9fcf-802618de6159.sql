
-- Create chat-media storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to chat-media
CREATE POLICY "Authenticated users can upload chat media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-media');

-- Allow authenticated users to read their org's chat media
CREATE POLICY "Authenticated users can read chat media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-media');

-- Add attachment_urls column to messages for multiple media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'attachment_urls'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN attachment_urls jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
