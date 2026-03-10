ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_number text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_username text DEFAULT NULL;