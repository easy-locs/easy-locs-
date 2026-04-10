
-- Update handle_new_user: clients get NO org, NO subscription by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create profile with client type by default (no org needed)
  INSERT INTO public.profiles (id, email, name, user_type, onboarding_completed)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    'client',
    true
  );

  RETURN NEW;
END;
$function$;
