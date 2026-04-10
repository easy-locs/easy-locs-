
ALTER TABLE public.concierge_orders 
ADD COLUMN IF NOT EXISTS document_urls jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS end_time text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS property_label text DEFAULT NULL;
