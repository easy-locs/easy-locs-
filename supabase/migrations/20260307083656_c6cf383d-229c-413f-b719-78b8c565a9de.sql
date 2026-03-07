
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_messages boolean NOT NULL DEFAULT true,
  email_payments boolean NOT NULL DEFAULT true,
  email_documents boolean NOT NULL DEFAULT true,
  email_maintenance boolean NOT NULL DEFAULT true,
  email_urgent_only boolean NOT NULL DEFAULT false,
  in_app_messages boolean NOT NULL DEFAULT true,
  in_app_payments boolean NOT NULL DEFAULT true,
  in_app_documents boolean NOT NULL DEFAULT true,
  in_app_maintenance boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own prefs" ON public.notification_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own prefs" ON public.notification_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own prefs" ON public.notification_preferences
  FOR UPDATE USING (user_id = auth.uid());
