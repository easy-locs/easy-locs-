
-- Re-run without the realtime line since messages is already in the publication
-- Add category and translation columns to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS translated_content text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_locale text;

-- Add signature tracking columns to documents
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS requires_signature boolean DEFAULT false;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS signed_by_owner_at timestamptz;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS signed_by_tenant_at timestamptz;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS owner_signature_url text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS tenant_signature_url text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS emailed_at timestamptz;
