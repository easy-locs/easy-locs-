ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS language_detected text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS translated_locale text;